import React from 'react';
import { AccordionTrigger } from '@ohif/ui-next';
import { ChevronDownIcon } from '@radix-ui/react-icons';

type AiPanelAccordionTriggerProps = {
  marginLeft?: number | string;
  isActive?: boolean;
  colorHex?: string;
  count?: number;
  text: string;
  menu?: React.ComponentType<any> | null;
  group?: Record<string, any>;
  onClick?: (event: React.MouseEvent, group?: Record<string, any>) => void;
};

function onClickDefault(this: AiPanelAccordionTriggerProps, event: React.MouseEvent) {
  const { group, onClick = group?.onClick } = this;

  if (!onClick) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  onClick(event, group);

  return false;
}

export default function AiPanelAccordionTrigger(props: AiPanelAccordionTriggerProps) {
  const {
    marginLeft = 8,
    isActive = false,
    colorHex,
    count,
    text,
    menu: Menu = null,
  } = props;

  return (
    <AccordionTrigger
      style={{ marginLeft: `${marginLeft}px`, padding: 0 }}
      asChild={true}
    >
      <div className={`inline-flex text-base ${isActive ? 'bg-popover' : 'bg-muted'} group flex-grow`}>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center text-left"
          onClick={onClickDefault.bind(props)}
        >
          <span
            className={`inline-flex shrink-0 rounded-l border-r border-background ${
              isActive ? 'bg-highlight' : 'bg-muted'
            }`}
          >
            {count !== undefined ? <span className="px-2">{count}</span> : null}
          </span>
          <span className="min-w-0 flex-1 truncate px-2" title={text}>
            {text}
          </span>
        </button>

        {Menu && (
          <Menu
            {...props}
            classNames="shrink-0"
          />
        )}

        <ChevronDownIcon className="text-primary h-4 w-4 shrink-0 self-center transition-transform duration-200" />
      </div>
    </AccordionTrigger>
  );
}
