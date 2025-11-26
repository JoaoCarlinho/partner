/**
 * Feedback Form Component
 * Allows debtors to submit structured feedback to creditors
 */

import React, { useState, useEffect } from 'react';

/**
 * Feedback category types
 */
enum FeedbackCategory {
  FINANCIAL_HARDSHIP = 'financial_hardship',
  DISPUTE_VALIDITY = 'dispute_validity',
  PAYMENT_TERMS = 'payment_terms',
  REQUEST_INFO = 'request_info',
  GENERAL = 'general',
}

interface TemplatePrompt {
  id: string;
  question: string;
  placeholder?: string;
  optional: boolean;
  inputType: 'text' | 'textarea' | 'select' | 'radio';
  options?: string[];
}

interface FeedbackTemplate {
  category: FeedbackCategory;
  title: string;
  description: string;
  prompts: TemplatePrompt[];
  freeformAllowed: boolean;
  icon: string;
}

interface ToneCoaching {
  toneAssessment: 'appropriate' | 'could_improve' | 'needs_attention';
  emotionalState: string;
  coachingNote: string;
  suggestedRevision: string | null;
  preserveElements: string[];
}

interface FeedbackFormProps {
  caseId: string;
  debtorId: string;
  onSubmit?: (feedbackId: string) => void;
  className?: string;
}

/**
 * Category selector card
 */
const CategoryCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}> = ({ title, description, icon, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
      selected
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
    }`}
  >
    <div className="flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  </button>
);

/**
 * Tone coaching display
 */
const ToneCoachingDisplay: React.FC<{
  coaching: ToneCoaching;
  onApplySuggestion?: () => void;
}> = ({ coaching, onApplySuggestion }) => {
  const getAssessmentColor = () => {
    switch (coaching.toneAssessment) {
      case 'appropriate':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'could_improve':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'needs_attention':
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getAssessmentColor()}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">
          {coaching.toneAssessment === 'appropriate' ? '✓' : coaching.toneAssessment === 'could_improve' ? '💡' : '⚠️'}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">{coaching.coachingNote}</p>
          {coaching.preserveElements.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-600">Keep these elements:</p>
              <ul className="text-xs text-gray-700 mt-1">
                {coaching.preserveElements.map((el, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="text-green-600">+</span> {el}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {coaching.suggestedRevision && onApplySuggestion && (
            <button
              onClick={onApplySuggestion}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Apply suggested revision
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  caseId,
  debtorId,
  onSubmit,
  className = '',
}) => {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [freeformContent, setFreeformContent] = useState('');
  const [useFreeform, setUseFreeform] = useState(false);
  const [requestAssist, setRequestAssist] = useState(false);
  const [toneCoaching, setToneCoaching] = useState<ToneCoaching | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoaching, setIsCoaching] = useState(false);
  const [step, setStep] = useState<'category' | 'form' | 'review'>('category');

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/v1/feedback/templates');
      const result = await response.json();
      if (result.success) {
        setTemplates(result.data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const selectedTemplate = templates.find((t) => t.category === selectedCategory);

  // Get tone coaching for content
  const getToneCoaching = async (content: string) => {
    if (content.length < 20) {
      setToneCoaching(null);
      return;
    }

    setIsCoaching(true);
    try {
      const response = await fetch('/api/v1/feedback/coach-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });
      const result = await response.json();
      if (result.success) {
        setToneCoaching(result.data);
      }
    } catch (error) {
      console.error('Failed to get tone coaching:', error);
    } finally {
      setIsCoaching(false);
    }
  };

  // Debounced tone coaching
  useEffect(() => {
    const content = useFreeform ? freeformContent : buildContentFromResponses();
    const timer = setTimeout(() => {
      getToneCoaching(content);
    }, 1000);
    return () => clearTimeout(timer);
  }, [freeformContent, responses, useFreeform]);

  const buildContentFromResponses = (): string => {
    if (!selectedTemplate) return '';

    return selectedTemplate.prompts
      .filter((p) => responses[p.id])
      .map((p) => `${p.question}\n${responses[p.id]}`)
      .join('\n\n');
  };

  const handleSubmit = async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    try {
      const content = useFreeform ? freeformContent : buildContentFromResponses();

      const response = await fetch(`/api/v1/cases/${caseId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          content,
          requestAiAssist: requestAssist,
          debtorId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        onSubmit?.(result.data.id);
        // Reset form
        setSelectedCategory(null);
        setResponses({});
        setFreeformContent('');
        setStep('category');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applySuggestedRevision = () => {
    if (toneCoaching?.suggestedRevision) {
      if (useFreeform) {
        setFreeformContent(toneCoaching.suggestedRevision);
      }
    }
  };

  // Render category selection
  if (step === 'category') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Share Your Feedback</h2>
          <p className="text-sm text-gray-600 mt-1">
            Choose a category that best describes what you want to communicate.
          </p>
        </div>

        <div className="space-y-3">
          {templates.map((template) => (
            <CategoryCard
              key={template.category}
              title={template.title}
              description={template.description}
              icon={template.icon}
              selected={selectedCategory === template.category}
              onClick={() => {
                setSelectedCategory(template.category);
                setStep('form');
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Render form
  if (step === 'form' && selectedTemplate) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep('category')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedTemplate.icon} {selectedTemplate.title}
            </h2>
            <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
          </div>
        </div>

        {/* Mode toggle */}
        {selectedTemplate.freeformAllowed && (
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <button
              onClick={() => setUseFreeform(false)}
              className={`px-3 py-1 rounded-md text-sm ${
                !useFreeform ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              Guided
            </button>
            <button
              onClick={() => setUseFreeform(true)}
              className={`px-3 py-1 rounded-md text-sm ${
                useFreeform ? 'bg-white shadow text-blue-600' : 'text-gray-600'
              }`}
            >
              Free-form
            </button>
          </div>
        )}

        {/* Form content */}
        {useFreeform ? (
          <div className="space-y-3">
            <textarea
              value={freeformContent}
              onChange={(e) => setFreeformContent(e.target.value)}
              placeholder="Write your message here. Express your concerns clearly and we'll help format it constructively."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {selectedTemplate.prompts.map((prompt) => (
              <div key={prompt.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {prompt.question}
                  {prompt.optional && <span className="text-gray-400 ml-1">(optional)</span>}
                </label>

                {prompt.inputType === 'textarea' ? (
                  <textarea
                    value={responses[prompt.id] || ''}
                    onChange={(e) =>
                      setResponses({ ...responses, [prompt.id]: e.target.value })
                    }
                    placeholder={prompt.placeholder}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                ) : prompt.inputType === 'select' ? (
                  <select
                    value={responses[prompt.id] || ''}
                    onChange={(e) =>
                      setResponses({ ...responses, [prompt.id]: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an option...</option>
                    {prompt.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : prompt.inputType === 'radio' ? (
                  <div className="space-y-2">
                    {prompt.options?.map((opt) => (
                      <label key={opt} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={prompt.id}
                          value={opt}
                          checked={responses[prompt.id] === opt}
                          onChange={(e) =>
                            setResponses({ ...responses, [prompt.id]: e.target.value })
                          }
                          className="text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={responses[prompt.id] || ''}
                    onChange={(e) =>
                      setResponses({ ...responses, [prompt.id]: e.target.value })
                    }
                    placeholder={prompt.placeholder}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tone coaching */}
        {toneCoaching && (
          <ToneCoachingDisplay
            coaching={toneCoaching}
            onApplySuggestion={useFreeform ? applySuggestedRevision : undefined}
          />
        )}

        {/* AI assist option */}
        <label className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={requestAssist}
            onChange={(e) => setRequestAssist(e.target.checked)}
            className="rounded text-blue-600"
          />
          <div>
            <span className="text-sm font-medium text-blue-800">
              Help me express this clearly
            </span>
            <p className="text-xs text-blue-600">
              AI will help structure your thoughts while keeping your voice
            </p>
          </div>
        </label>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setStep('category')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default FeedbackForm;
