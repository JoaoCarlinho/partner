/**
 * Analytics API Handler
 * Endpoints for platform metrics and analytics
 */

import { Router, Request, Response } from 'express';
import {
  DemandData,
  TimePeriod,
  calculateOverviewMetrics,
  calculateResolutionMetrics,
  calculateFinancialMetrics,
  generateTrendData,
  calculateCreditorMetrics,
  getDateRange,
} from '../services/analytics/metricsCalculator';

const router = Router();

/**
 * Generate sample demand data for demo
 * In production, this would come from database
 */
function generateSampleDemands(count: number = 100): DemandData[] {
  const statuses: Array<'active' | 'resolved' | 'defaulted' | 'disputed'> = [
    'active',
    'resolved',
    'defaulted',
    'disputed',
  ];
  const creditors = ['cred_1', 'cred_2', 'cred_3', 'cred_4', 'cred_5'];

  const demands: DemandData[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 365));

    const amount = Math.round((Math.random() * 9000 + 1000) * 100) / 100;
    const status = statuses[Math.floor(Math.random() * (i < count * 0.6 ? 2 : 4))]; // Bias toward active/resolved

    let resolvedAt: Date | undefined;
    let paidAmount = 0;

    if (status === 'resolved') {
      resolvedAt = new Date(createdAt);
      resolvedAt.setDate(resolvedAt.getDate() + Math.floor(Math.random() * 60) + 10);
      paidAmount = Math.random() > 0.3 ? amount : amount * (Math.random() * 0.5 + 0.3);
    } else if (status === 'active') {
      paidAmount = amount * Math.random() * 0.5;
    }

    demands.push({
      id: `demand_${i}`,
      amount,
      status,
      createdAt,
      resolvedAt,
      paidAmount: Math.round(paidAmount * 100) / 100,
      creditorId: creditors[Math.floor(Math.random() * creditors.length)],
    });
  }

  return demands;
}

// Cache sample data
let cachedDemands: DemandData[] | null = null;

function getDemands(): DemandData[] {
  if (!cachedDemands) {
    cachedDemands = generateSampleDemands(200);
  }
  return cachedDemands;
}

/**
 * Get overview metrics
 * GET /api/analytics/overview
 */
router.get('/overview', (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    const demands = getDemands();

    // Filter by period if specified
    let filteredDemands = demands;
    if (period && period !== 'all') {
      const { start } = getDateRange(period as TimePeriod);
      filteredDemands = demands.filter((d) => d.createdAt >= start);
    }

    const metrics = calculateOverviewMetrics(filteredDemands);

    return res.json({
      period: period || 'all',
      metrics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Overview metrics error:', error);
    return res.status(500).json({ error: 'Failed to calculate overview metrics' });
  }
});

/**
 * Get resolution metrics
 * GET /api/analytics/resolutions
 */
router.get('/resolutions', (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    const demands = getDemands();

    const metrics = calculateResolutionMetrics(demands, period as TimePeriod);

    return res.json({
      period,
      metrics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Resolution metrics error:', error);
    return res.status(500).json({ error: 'Failed to calculate resolution metrics' });
  }
});

/**
 * Get financial metrics
 * GET /api/analytics/financial
 */
router.get('/financial', (req: Request, res: Response) => {
  try {
    const demands = getDemands();
    const metrics = calculateFinancialMetrics(demands);

    return res.json({
      metrics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Financial metrics error:', error);
    return res.status(500).json({ error: 'Failed to calculate financial metrics' });
  }
});

/**
 * Get trend data
 * GET /api/analytics/trends
 */
router.get('/trends', (req: Request, res: Response) => {
  try {
    const { metric = 'collections', period = 'month' } = req.query;
    const demands = getDemands();

    const validMetrics = ['collections', 'resolutions', 'demands'];
    if (!validMetrics.includes(metric as string)) {
      return res.status(400).json({ error: 'Invalid metric type' });
    }

    const trends = generateTrendData(
      demands,
      metric as 'collections' | 'resolutions' | 'demands',
      period as TimePeriod
    );

    return res.json({
      metric,
      period,
      trends,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Trend data error:', error);
    return res.status(500).json({ error: 'Failed to generate trend data' });
  }
});

/**
 * Get creditor-specific metrics
 * GET /api/analytics/creditor/:creditorId
 */
router.get('/creditor/:creditorId', (req: Request, res: Response) => {
  try {
    const { creditorId } = req.params;
    const demands = getDemands();

    const metrics = calculateCreditorMetrics(demands, creditorId);

    if (metrics.overview.totalDemands === 0) {
      return res.status(404).json({ error: 'No data found for creditor' });
    }

    return res.json({
      creditorId,
      ...metrics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Creditor metrics error:', error);
    return res.status(500).json({ error: 'Failed to calculate creditor metrics' });
  }
});

/**
 * Get dashboard summary
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    const demands = getDemands();

    const { start } = getDateRange(period as TimePeriod);
    const periodDemands = demands.filter((d) => d.createdAt >= start);
    const previousPeriodDemands = demands.filter((d) => {
      const periodLength = Date.now() - start.getTime();
      const previousStart = new Date(start.getTime() - periodLength);
      return d.createdAt >= previousStart && d.createdAt < start;
    });

    const currentOverview = calculateOverviewMetrics(periodDemands);
    const previousOverview = calculateOverviewMetrics(previousPeriodDemands);

    // Calculate changes
    const changes = {
      totalDemands:
        previousOverview.totalDemands > 0
          ? ((currentOverview.totalDemands - previousOverview.totalDemands) /
              previousOverview.totalDemands) *
            100
          : 0,
      collectionRate: currentOverview.collectionRate - previousOverview.collectionRate,
      resolvedDemands:
        previousOverview.resolvedDemands > 0
          ? ((currentOverview.resolvedDemands - previousOverview.resolvedDemands) /
              previousOverview.resolvedDemands) *
            100
          : 0,
      totalAmountCollected:
        previousOverview.totalAmountCollected > 0
          ? ((currentOverview.totalAmountCollected - previousOverview.totalAmountCollected) /
              previousOverview.totalAmountCollected) *
            100
          : 0,
    };

    const financial = calculateFinancialMetrics(demands);
    const trends = {
      collections: generateTrendData(demands, 'collections', period as TimePeriod),
      resolutions: generateTrendData(demands, 'resolutions', period as TimePeriod),
    };

    return res.json({
      period,
      overview: currentOverview,
      changes: {
        totalDemands: Math.round(changes.totalDemands * 10) / 10,
        collectionRate: Math.round(changes.collectionRate * 10) / 10,
        resolvedDemands: Math.round(changes.resolvedDemands * 10) / 10,
        totalAmountCollected: Math.round(changes.totalAmountCollected * 10) / 10,
      },
      financial,
      trends,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
});

/**
 * Export analytics data
 * GET /api/analytics/export
 */
router.get('/export', (req: Request, res: Response) => {
  try {
    const { format = 'json', period = 'month' } = req.query;
    const demands = getDemands();

    const { start } = getDateRange(period as TimePeriod);
    const periodDemands = demands.filter((d) => d.createdAt >= start);

    const overview = calculateOverviewMetrics(periodDemands);
    const resolutions = calculateResolutionMetrics(periodDemands, period as TimePeriod);
    const financial = calculateFinancialMetrics(demands);

    const exportData = {
      exportDate: new Date().toISOString(),
      period,
      overview,
      resolutions,
      financial,
    };

    if (format === 'csv') {
      // Simplified CSV export
      const csvRows = [
        'Metric,Value',
        `Total Demands,${overview.totalDemands}`,
        `Active Demands,${overview.activeDemands}`,
        `Resolved Demands,${overview.resolvedDemands}`,
        `Total Amount Owed,$${overview.totalAmountOwed}`,
        `Total Amount Collected,$${overview.totalAmountCollected}`,
        `Collection Rate,${overview.collectionRate}%`,
        `Average Resolution Time,${overview.averageResolutionTime} days`,
        `Recovery Rate,${financial.recoveryRate}%`,
        `Default Rate,${financial.defaultRate}%`,
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
      return res.send(csvRows.join('\n'));
    }

    return res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

export default router;
