import React, { useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icons,
} from '@ohif/ui-next';
import type { PredictionItem } from '../services/aiApi';

type AiPredictionMenuProps = {
  group: {
    items: PredictionItem[];
    isSelected?: boolean;
    isVisible?: boolean;
    onToggleVisibility?: (prediction: PredictionItem) => void;
    onDetails?: (prediction: PredictionItem) => void;
    onDelete?: (prediction: PredictionItem) => void;
  };
  classNames?: string;
};

export default function AiPredictionMenu(props: AiPredictionMenuProps) {
  const { group, classNames = '' } = props;

  if (!group.items?.length) {
    return null;
  }

  const [prediction] = group.items;
  const { isSelected, isVisible = isSelected } = group;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className={`relative ml-2 inline-flex items-center space-x-1 ${classNames}`}>
      <Button
        size="icon"
        variant="ghost"
        className={`h-6 w-6 transition-opacity ${
          isSelected || !isVisible ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'
        }`}
        aria-label={isVisible ? 'Hide AI prediction' : 'Show AI prediction'}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          group.onToggleVisibility?.(prediction);
        }}
      >
        {isVisible ? <Icons.Hide className="h-6 w-6" /> : <Icons.Show className="h-6 w-6" />}
      </Button>

      <DropdownMenu onOpenChange={open => setIsDropdownOpen(open)}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={`h-6 w-6 transition-opacity ${
              isSelected || isDropdownOpen ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'
            }`}
            aria-label="AI prediction actions"
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <Icons.More className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              group.onDetails?.(prediction);
            }}
          >
            <Icons.More className="text-foreground" />
            <span className="pl-2">Details</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              group.onDelete?.(prediction);
            }}
          >
            <Icons.Delete className="text-foreground" />
            <span className="pl-2">Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
