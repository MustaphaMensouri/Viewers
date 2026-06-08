import React from 'react';
import { Accordion, AccordionContent, AccordionItem } from '@ohif/ui-next';
import type { PredictionItem } from '../services/aiApi';
import AiPanelAccordionTrigger from './AiPanelAccordionTrigger';
import AiPredictionMenu from './AiPredictionMenu';

function formatPercent(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(1)}%`;
}

function getBoxesCount(prediction: PredictionItem) {
  return prediction.attention_boxes?.length || 0;
}

type AiPredictionItemsProps = {
  items: PredictionItem[];
  selectedLabel: string | null;
  onSelect: (prediction: PredictionItem) => void;
  onToggleVisibility: (prediction: PredictionItem) => void;
  onDetails: (prediction: PredictionItem) => void;
  onDelete: (prediction: PredictionItem) => void;
};

export default function AiPredictionItems(props: AiPredictionItemsProps) {
  const { items, selectedLabel, onSelect, onToggleVisibility, onDetails, onDelete } = props;

  return (
    <Accordion
      type="multiple"
      className="flex-shrink-0 overflow-hidden"
    >
      {items.map((prediction, index) => {
        const isSelected = selectedLabel === prediction.label;
        const boxesCount = getBoxesCount(prediction);
        const group = {
          items: [prediction],
          isSelected,
          isVisible: isSelected,
          onClick: () => onSelect(prediction),
          onToggleVisibility,
          onDetails,
          onDelete,
        };

        return (
          <AccordionItem
            key={`aiPredictionAccordion:${prediction.label}:${index}`}
            value={`${prediction.label}:${index}`}
          >
            <AiPanelAccordionTrigger
              count={index + 1}
              text={prediction.label}
              colorHex={prediction.positive ? '#facc15' : '#64748b'}
              isActive={isSelected}
              group={group}
              menu={AiPredictionMenu}
            />

            <AccordionContent key={`aiPredictionContent:${prediction.label}:${index}`}>
              <div className="ml-7 px-2 py-2">
                <div className="text-secondary-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-base leading-normal">
                  <span className="text-primary-light font-medium">
                    {formatPercent(prediction.probability)}
                  </span>
                  <span>Threshold: {formatPercent(prediction.threshold)}</span>
                </div>

                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-normal">
                  <span>Boxes: {boxesCount}</span>
                  <span>Heatmap: {prediction.heatmap_png ? 'available' : 'not available'}</span>
                  <span>{prediction.explanation_method || 'gradcam++'}</span>
                  {!prediction.positive && <span>Below threshold</span>}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
