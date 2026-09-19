import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, X } from 'lucide-react';

interface TutorialCalloutProps {
  targetId: string;
  title: string;
  description: string;
  action?: string;
  stepNumber: number;
  totalSteps: number;
}

type Placement = 'left' | 'right' | 'bottom';

const HEADER_OFFSET = 140;
const VIEWPORT_MARGIN = 12;
const CLUSTER_GAP = 10;
const BUBBLE_BG = '#1e293b';
const GOLD = '#F5C542';
const ARROW_WIDTH = 36;
const MAX_BUBBLE_WIDTH = 300;
const MIN_BUBBLE_WIDTH = 200;

const targetIsOnScreen = (rect: DOMRect) =>
  rect.bottom > 8 &&
  rect.top < window.innerHeight - 8 &&
  rect.right > 8 &&
  rect.left < window.innerWidth - 8;

const findTutorialTarget = (targetId: string): HTMLElement | null => {
  const marked = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tutorial-target="${targetId}"]`)
  );
  const visible = marked.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  return visible || marked[0] || document.getElementById(targetId);
};

const TutorialCallout: React.FC<TutorialCalloutProps> = ({
  targetId,
  title,
  description,
  action,
  stepNumber,
  totalSteps,
}) => {
  const clusterRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: Placement;
    bubbleWidth: number;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [targetId, stepNumber]);

  useLayoutEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let scrolledForStep = false;

    const getTarget = () => findTutorialTarget(targetId);

    const position = () => {
      const target = getTarget();
      const cluster = clusterRef.current;
      if (cancelled || !target || !cluster) return;

      const targetRect = target.getBoundingClientRect();
      if (!targetIsOnScreen(targetRect)) {
        setReady(false);
        return;
      }

      const inMiniNav = Boolean(target.closest('[data-tutorial-mini-nav]'));
      const inTopNav = !inMiniNav && targetRect.top < 90;
      const pinBelow = inTopNav || inMiniNav;
      const isDesktop = window.innerWidth >= 1024;
      const sidebar = document.getElementById('tutorial-sidebar')?.getBoundingClientRect();
      const mainPanel = document.getElementById('tutorial-main-panel')?.getBoundingClientRect();

      const leftBound = inTopNav
        ? VIEWPORT_MARGIN
        : isDesktop
          ? Math.max(VIEWPORT_MARGIN, sidebar?.right ?? 0, mainPanel?.left ?? 0) + 8
          : VIEWPORT_MARGIN;
      const rightBound = inTopNav
        ? window.innerWidth - VIEWPORT_MARGIN
        : Math.min(
            window.innerWidth - VIEWPORT_MARGIN,
            isDesktop ? (mainPanel?.right ?? window.innerWidth) - 8 : window.innerWidth - VIEWPORT_MARGIN
          );

      let placement: Placement = 'left';
      let bubbleWidth = MAX_BUBBLE_WIDTH;
      let top = 0;
      let left = 0;

      const bubbleEl = cluster.firstElementChild as HTMLElement | null;

      if (pinBelow) {
        placement = 'bottom';
        bubbleWidth = Math.min(MAX_BUBBLE_WIDTH, Math.max(MIN_BUBBLE_WIDTH, rightBound - leftBound));
        if (bubbleEl) bubbleEl.style.width = `${bubbleWidth}px`;
        top = targetRect.bottom + CLUSTER_GAP;
        left = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
        left = Math.max(leftBound, Math.min(left, rightBound - bubbleWidth));
      } else {
        const spaceLeft = targetRect.left - leftBound - CLUSTER_GAP;
        const spaceRight = rightBound - targetRect.right - CLUSTER_GAP;
        placement =
          spaceRight >= spaceLeft && spaceRight > MIN_BUBBLE_WIDTH + ARROW_WIDTH
            ? 'right'
            : spaceLeft >= MIN_BUBBLE_WIDTH + ARROW_WIDTH
              ? 'left'
              : spaceRight >= spaceLeft
                ? 'right'
                : 'left';

        const available = placement === 'left' ? spaceLeft : spaceRight;
        bubbleWidth = Math.max(
          MIN_BUBBLE_WIDTH,
          Math.min(MAX_BUBBLE_WIDTH, available - ARROW_WIDTH)
        );

        if (bubbleEl) bubbleEl.style.width = `${bubbleWidth}px`;
        const clusterHeight = cluster.offsetHeight || 200;
        top = targetRect.top + targetRect.height / 2 - clusterHeight / 2;

        let clusterWidth = bubbleWidth + ARROW_WIDTH;
        left =
          placement === 'left'
            ? targetRect.left - clusterWidth - CLUSTER_GAP
            : targetRect.right + CLUSTER_GAP;

        if (placement === 'left' && left < leftBound) {
          bubbleWidth = Math.max(MIN_BUBBLE_WIDTH, bubbleWidth - (leftBound - left));
          if (bubbleEl) bubbleEl.style.width = `${bubbleWidth}px`;
          clusterWidth = bubbleWidth + ARROW_WIDTH;
          left = Math.min(leftBound, targetRect.left - clusterWidth - CLUSTER_GAP);
        }
        if (placement === 'right' && left + clusterWidth > rightBound) {
          bubbleWidth = Math.max(MIN_BUBBLE_WIDTH, bubbleWidth - (left + clusterWidth - rightBound));
          if (bubbleEl) bubbleEl.style.width = `${bubbleWidth}px`;
        }
      }

      setCoords({ top, left, placement, bubbleWidth });
      setReady(true);
    };

    const revealTarget = () => {
      const target = getTarget();
      if (!target) {
        if (!cancelled && attempts < 50) {
          attempts += 1;
          requestAnimationFrame(revealTarget);
        }
        return;
      }

      if (!scrolledForStep) {
        const miniNav = target.closest('[data-tutorial-mini-nav]');
        const miniSite = target.closest('[data-tutorial-mini-site]') as HTMLElement | null;
        if (miniNav && miniSite) {
          scrolledForStep = true;
          miniSite.style.scrollMarginTop = `${HEADER_OFFSET + 16}px`;
          miniSite.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
        } else {
          const targetRect = target.getBoundingClientRect();
          const inTopNav = targetRect.top < 90;
          if (!inTopNav && !targetIsOnScreen(targetRect)) {
            scrolledForStep = true;
            target.style.scrollMarginTop = `${HEADER_OFFSET + 24}px`;
            target.style.scrollMarginBottom = '48px';
            target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
          }
        }
      }

      requestAnimationFrame(position);
    };

    setReady(false);
    setCoords(null);
    const start = window.setTimeout(revealTarget, 40);
    const retry = window.setTimeout(revealTarget, 250);

    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearTimeout(retry);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [targetId, title, description, action, stepNumber]);

  if (typeof document === 'undefined' || dismissed) return null;

  const visible = ready && coords;
  const pointRight = coords?.placement === 'left';
  const pointUp = coords?.placement === 'bottom';

  return createPortal(
    <div
      ref={clusterRef}
      role="status"
      aria-live="polite"
      className="pointer-events-none"
      style={{
        position: 'fixed',
        top: coords?.top ?? -9999,
        left: coords?.left ?? VIEWPORT_MARGIN,
        zIndex: 60,
        opacity: visible ? 1 : 0,
        display: 'flex',
        flexDirection: pointUp ? 'column-reverse' : pointRight ? 'row' : 'row-reverse',
        alignItems: 'center',
      }}
    >
      <div
        className="rounded-xl shadow-2xl pointer-events-auto relative"
        style={{
          width: coords?.bubbleWidth ?? MAX_BUBBLE_WIDTH,
          backgroundColor: BUBBLE_BG,
        }}
      >
        <button
          type="button"
          aria-label="Hide tip"
          onClick={() => setDismissed(true)}
          className="absolute top-2.5 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div
          className="h-1.5 rounded-t-xl"
          style={{ background: `linear-gradient(90deg, #4F7FFB 0%, ${GOLD} 100%)` }}
        />
        <div className="px-4 py-3.5 pr-9">
          <p className="text-[11px] uppercase tracking-wider font-semibold mb-1" style={{ color: GOLD }}>
            Step {stepNumber} of {totalSteps}
          </p>
          <h3 className="text-base font-bold leading-snug mb-1.5" style={{ color: '#FFFFFF' }}>
            {title}
          </h3>
          <p className="text-sm leading-relaxed pointer-events-auto" style={{ color: '#F3F4F6' }}>
            {description}
          </p>
          {action && (
            <p className="mt-3 flex items-start gap-2 text-sm font-semibold" style={{ color: GOLD }}>
              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{action}</span>
            </p>
          )}
        </div>
      </div>

      <svg
        width="36"
        height="28"
        viewBox="0 0 36 28"
        fill="none"
        aria-hidden="true"
        style={{
          display: 'block',
          flexShrink: 0,
          transform: pointUp ? 'rotate(-90deg)' : pointRight ? 'none' : 'scaleX(-1)',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
          marginLeft: pointRight ? -2 : 0,
          marginRight: pointRight ? 0 : -2,
        }}
      >
        <path d="M2 11 H16 V4 L34 14 L16 24 V17 H2 Z" fill={GOLD} stroke={BUBBLE_BG} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>,
    document.body
  );
};

export default TutorialCallout;
