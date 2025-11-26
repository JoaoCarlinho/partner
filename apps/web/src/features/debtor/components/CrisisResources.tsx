/**
 * Crisis Resources Component
 * Displays crisis and support resources for debtors in distress
 */

import React, { useState } from 'react';

interface CrisisResource {
  name: string;
  phone?: string;
  sms?: string;
  url?: string;
  description: string;
}

interface CrisisResourcesProps {
  resources?: CrisisResource[];
  variant?: 'banner' | 'panel' | 'footer';
  onDismiss?: () => void;
  className?: string;
}

// Default crisis resources
const DEFAULT_RESOURCES: CrisisResource[] = [
  {
    name: 'National Suicide Prevention Lifeline',
    phone: '988',
    description: '24/7 free and confidential support',
  },
  {
    name: 'Crisis Text Line',
    sms: '741741',
    description: 'Text HOME to get help',
  },
  {
    name: 'NFCC Financial Counseling',
    phone: '1-800-388-2227',
    url: 'https://www.nfcc.org',
    description: 'Free financial counseling',
  },
];

/**
 * Banner variant - prominent display for escalation situations
 */
const BannerVariant: React.FC<{
  resources: CrisisResource[];
  onDismiss?: () => void;
}> = ({ resources, onDismiss }) => (
  <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          If you're struggling, help is available
        </h3>
        <p className="text-blue-800 mb-4">
          You don't have to face this alone. These services are free and confidential.
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-blue-600 hover:text-blue-800 p-1"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource, index) => (
        <div
          key={index}
          className="bg-white rounded-lg p-4 shadow-sm border border-blue-100"
        >
          <h4 className="font-medium text-gray-900 mb-1">{resource.name}</h4>
          <p className="text-sm text-gray-600 mb-2">{resource.description}</p>
          <div className="flex flex-wrap gap-2">
            {resource.phone && (
              <a
                href={`tel:${resource.phone}`}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700"
              >
                📞 {resource.phone}
              </a>
            )}
            {resource.sms && (
              <a
                href={`sms:${resource.sms}`}
                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-full hover:bg-green-700"
              >
                💬 Text {resource.sms}
              </a>
            )}
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 bg-gray-600 text-white text-sm rounded-full hover:bg-gray-700"
              >
                🔗 Website
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Panel variant - collapsible panel for sidebar/inline display
 */
const PanelVariant: React.FC<{ resources: CrisisResource[] }> = ({ resources }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-600">💙</span>
          <span className="font-medium text-gray-800">Need support?</span>
        </div>
        <span
          className="text-gray-400 transition-transform"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
        >
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-gray-600">
            Free and confidential resources are available:
          </p>
          {resources.map((resource, index) => (
            <div key={index} className="flex flex-col">
              <span className="font-medium text-gray-800">{resource.name}</span>
              <div className="flex gap-2 text-sm">
                {resource.phone && (
                  <a
                    href={`tel:${resource.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {resource.phone}
                  </a>
                )}
                {resource.sms && (
                  <span className="text-gray-500">
                    Text HOME to{' '}
                    <a
                      href={`sms:${resource.sms}`}
                      className="text-blue-600 hover:underline"
                    >
                      {resource.sms}
                    </a>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Footer variant - subtle always-visible footer link
 */
const FooterVariant: React.FC<{ resources: CrisisResource[] }> = ({ resources }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
      >
        💙 Need support? Help is available.
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Support Resources
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              If you're going through a difficult time, these free and confidential
              resources are here to help. You're not alone.
            </p>

            <div className="space-y-4">
              {resources.map((resource, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <h3 className="font-medium text-gray-900 mb-1">
                    {resource.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {resource.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resource.phone && (
                      <a
                        href={`tel:${resource.phone}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Call {resource.phone}
                      </a>
                    )}
                    {resource.sms && (
                      <a
                        href={`sms:${resource.sms}?body=HOME`}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Text {resource.sms}
                      </a>
                    )}
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500 text-center">
                You don't have to face this alone. 💙
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Main CrisisResources component
 */
export const CrisisResources: React.FC<CrisisResourcesProps> = ({
  resources = DEFAULT_RESOURCES,
  variant = 'panel',
  onDismiss,
  className = '',
}) => {
  return (
    <div className={className}>
      {variant === 'banner' && (
        <BannerVariant resources={resources} onDismiss={onDismiss} />
      )}
      {variant === 'panel' && <PanelVariant resources={resources} />}
      {variant === 'footer' && <FooterVariant resources={resources} />}
    </div>
  );
};

export default CrisisResources;
