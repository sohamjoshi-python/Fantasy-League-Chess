import React, { useState, useEffect, ReactNode } from 'react';

interface SmoothTransitionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight';
}

const transitionClasses = {
  fade: {
    enter: 'opacity-0',
    enterActive: 'opacity-100 transition-opacity',
    exit: 'opacity-100',
    exitActive: 'opacity-0 transition-opacity'
  },
  slideUp: {
    enter: 'opacity-0 transform translate-y-4',
    enterActive: 'opacity-100 transform translate-y-0 transition-all',
    exit: 'opacity-100 transform translate-y-0',
    exitActive: 'opacity-0 transform translate-y-4 transition-all'
  },
  slideDown: {
    enter: 'opacity-0 transform -translate-y-4',
    enterActive: 'opacity-100 transform translate-y-0 transition-all',
    exit: 'opacity-100 transform translate-y-0',
    exitActive: 'opacity-0 transform -translate-y-4 transition-all'
  },
  slideLeft: {
    enter: 'opacity-0 transform translate-x-4',
    enterActive: 'opacity-100 transform translate-x-0 transition-all',
    exit: 'opacity-100 transform translate-x-0',
    exitActive: 'opacity-0 transform translate-x-4 transition-all'
  },
  slideRight: {
    enter: 'opacity-0 transform -translate-x-4',
    enterActive: 'opacity-100 transform translate-x-0 transition-all',
    exit: 'opacity-100 transform translate-x-0',
    exitActive: 'opacity-0 transform -translate-x-4 transition-all'
  }
};

export const SmoothTransition: React.FC<SmoothTransitionProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 300,
  direction = 'fade'
}) => {
  const [isVisible, setIsVisible] = useState(delay <= 0);
  const [isExiting] = useState(false);

  useEffect(() => {
    if (delay <= 0) {
      setIsVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);


  const classes = transitionClasses[direction];
  const currentClass = isExiting 
    ? classes.exitActive 
    : isVisible 
      ? classes.enterActive 
      : classes.enter;

  return (
    <div 
      className={`${currentClass} ${className}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};

interface StaggeredTransitionProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  direction?: 'fade' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight';
}

// Cap stagger so jumping the scrollbar to the bottom does not show a blank list.
const MAX_STAGGERED_ITEMS = 8;

export const StaggeredTransition: React.FC<StaggeredTransitionProps> = ({
  children,
  className = '',
  staggerDelay = 100,
  direction = 'fade'
}) => {
  const items = React.Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, index) =>
        index < MAX_STAGGERED_ITEMS ? (
          <SmoothTransition
            key={index}
            delay={index * staggerDelay}
            direction={direction}
          >
            {child}
          </SmoothTransition>
        ) : (
          <div key={index}>{child}</div>
        )
      )}
    </div>
  );
};

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({ children, className = '', delay = 0 }) => {
  return (
    <SmoothTransition
      direction="fade"
      delay={delay}
      className={className}
    >
      {children}
    </SmoothTransition>
  );
};

interface SlideUpProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const SlideUp: React.FC<SlideUpProps> = ({ children, className = '', delay = 0 }) => {
  return (
    <SmoothTransition
      direction="slideUp"
      delay={delay}
      className={className}
    >
      {children}
    </SmoothTransition>
  );
};
