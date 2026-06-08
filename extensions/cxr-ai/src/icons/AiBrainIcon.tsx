import React from 'react';

interface AiSparkleTabIconProps extends React.SVGProps<SVGSVGElement> {}

export default function AiSparkleTabIcon(props: AiSparkleTabIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="16"
      height="16"
      {...props}
    >
      <path d="m12 3-2.2 6.3a1.5 1.5 0 0 1-1 1L2.5 12l6.3 2.2a1.5 1.5 0 0 1 1 1L12 21.5l2.2-6.3a1.5 1.5 0 0 1 1-1l6.3-2.2-6.3-2.2a1.5 1.5 0 0 1-1-1Z" />
    </svg>
  );
}
