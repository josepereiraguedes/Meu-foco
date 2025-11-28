import React from 'react';

interface CircleTimerProps {
  percentage: number; // 0 to 100
  label: string;
  subLabel: string;
  color?: string;
  children?: React.ReactNode;
}

const CircleTimer: React.FC<CircleTimerProps> = ({ percentage, label, subLabel, color = "#0ea5e9", children }) => {
  const radius = 120;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="rotate-[-90deg] transition-all duration-500 ease-in-out"
      >
        <circle
          stroke="rgba(229, 231, 235, 0.3)" // gray-200 with opacity
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear' }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ? children : (
            <>
                <span className="text-4xl font-bold font-mono tracking-tighter text-gray-800 dark:text-white">
                {label}
                </span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wide">
                {subLabel}
                </span>
            </>
        )}
      </div>
    </div>
  );
};

export default CircleTimer;
