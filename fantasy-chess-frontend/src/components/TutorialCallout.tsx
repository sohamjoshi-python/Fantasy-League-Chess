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

type Placement = 'left' | 'right' | 'bottom' | 'top';

const HEADER_OFFSET = 140;
const VIEWPORT_MARGIN = 12;
const CLUSTER_GAP = 10;
const BUBBLE_BG = '#1e293b';
const GOLD = '#F5C542';
const ARROW_WIDTH = 36;
const MAX_BUBBLE_WIDTH = 300;
const MIN_BUBBLE_WIDTH = 200;
const NARROW_BREAKPOINT = 1024;
const CALLOUT_BLOCK_ESTIMATE = 210;

const findScrollParent = (element: HTMLElement): HTMLElement | null => {
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(parent);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight + 2
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
};

const revealTargetInView = (target: HTMLElement, topPadding: number, bottomPadding: number) => {
  const rect = target.getBoundingClientRect();
  const scroller = findScrollParent(target);

  if (scroller) {
    const bounds = scroller.getBoundingClientRect();
    const above = rect.top - bounds.top - topPadding;
    const below = rect.bottom - (bounds.bottom - bottomPadding);
    if (above < -1) scroller.scrollTop += above;
    else if (below > 1) scroller.scrollTop += below;
    return;
  }

  const above = rect.top - topPadding;
  const below = rect.bottom - (window.innerHeight - bottomPadding);
  const nextTop =
    above < -1 ? window.scrollY + above : below > 1 ? window.scrollY + below : null;
  if (nextTop == null) return;
  window.scrollTo({ top: Math.max(0, nextTop), left: 0, behavior: 'auto' });
};

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
  const [layout, setLayout] = useState<{
    placement: Placement;
    bubbleWidth: number;
    visible: boolean;
  }>({
    placement: 'bottom',
    bubbleWidth: MAX_BUBBLE_WIDTH,
    visible: false,
  });
  const layoutRef = useRef(layout);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [targetId, stepNumber]);

  useLayoutEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let scrolledForStep = false;
    let frame = 0;

    const getTarget = () => findTutorialTarget(targetId);

    const commitLayout = (next: { placement: Placement; bubbleWidth: number; visible: boolean }) => {
      const prev = layoutRef.current;
      if (
        prev.placement === next.placement &&
        prev.bubbleWidth === next.bubbleWidth &&
        prev.visible === next.visible
      ) {
        return;
      }
      layoutRef.current = next;
      setLayout(next);
    };

    const position = () => {
      const target = getTarget();
      const cluster = clusterRef.current;
      if (cancelled || !target || !cluster) return;

      const targetRect = target.getBoundingClientRect();
      if (targetRect.width < 1 && targetRect.height < 1) return;

      const inMiniNav = Boolean(target.closest('[data-tutorial-mini-nav]'));
      const inTopNav = !inMiniNav && targetRect.top < 90;
      const pinBelow = inTopNav || inMiniNav;
      const narrow = window.innerWidth < NARROW_BREAKPOINT;
      const isDesktop = !narrow;
      const sidebar = document.getElementById('tutorial-sidebar')?.getBoundingClientRect();
      const mainPanel = document.getElementById('tutorial-main-panel')?.getBoundingClientRect();

      const leftBound = inTopNav || narrow
        ? VIEWPORT_MARGIN
        : Math.max(VIEWPORT_MARGIN, sidebar?.right ?? 0, mainPanel?.left ?? 0) + 8;
      const rightBound = inTopNav || narrow
        ? window.innerWidth - VIEWPORT_MARGIN
        : Math.min(
            window.innerWidth - VIEWPORT_MARGIN,
            isDesktop ? (mainPanel?.right ?? window.innerWidth) - 8 : window.innerWidth - VIEWPORT_MARGIN
          );

      let placement: Placement = 'bottom';
      let bubbleWidth = Math.min(MAX_BUBBLE_WIDTH, Math.max(160, rightBound - leftBound));
      let top = targetRect.bottom + CLUSTER_GAP;
      let left = targetRect.left;

      if (pinBelow || narrow) {
        const spaceBelow = window.innerHeight - targetRect.bottom;
        const spaceAbove = targetRect.top;
        const placeAbove = !pinBelow && spaceBelow < CALLOUT_BLOCK_ESTIMATE && spaceAbove > spaceBelow;
        placement = placeAbove ? 'top' : 'bottom';
        const clusterHeight = placeAbove ? cluster.offsetHeight || CALLOUT_BLOCK_ESTIMATE : 0;
        top = placeAbove
          ? targetRect.top - clusterHeight - CLUSTER_GAP
          : targetRect.bottom + CLUSTER_GAP;
        left = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
        left = Math.max(leftBound, Math.min(left, rightBound - bubbleWidth));
        if (placement === 'top') top = Math.max(VIEWPORT_MARGIN, top);
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

        const clusterHeight = cluster.offsetHeight || 200;
        top = targetRect.top + targetRect.height / 2 - clusterHeight / 2;

        let clusterWidth = bubbleWidth + ARROW_WIDTH;
        left =
          placement === 'left'
            ? targetRect.left - clusterWidth - CLUSTER_GAP
            : targetRect.right + CLUSTER_GAP;

        if (placement === 'left' && left < leftBound) {
          bubbleWidth = Math.max(MIN_BUBBLE_WIDTH, bubbleWidth - (leftBound - left));
          clusterWidth = bubbleWidth + ARROW_WIDTH;
          left = Math.min(leftBound, targetRect.left - clusterWidth - CLUSTER_GAP);
        }
        if (placement === 'right' && left + clusterWidth > rightBound) {
          bubbleWidth = Math.max(MIN_BUBBLE_WIDTH, bubbleWidth - (left + clusterWidth - rightBound));
        }
        top = Math.max(HEADER_OFFSET, Math.min(top, window.innerHeight - clusterHeight - VIEWPORT_MARGIN));
      }

      bubbleWidth = Math.round(bubbleWidth);
      const docTop = Math.round(top + window.scrollY);
      const docLeft = Math.round(left + window.scrollX);
      cluster.style.setProperty('--callout-top', `${docTop}px`);
      cluster.style.setProperty('--callout-left', `${docLeft}px`);
      commitLayout({ placement, bubbleWidth, visible: true });
    };

    const schedulePosition = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        position();
      });
    };

    let scroller: HTMLElement | null = null;

    const revealTarget = () => {
      const target = getTarget();
      if (!target) {
        if (!cancelled && attempts < 50) {
          attempts += 1;
          requestAnimationFrame(revealTarget);
        }
        return;
      }

      const nextScroller = findScrollParent(target);
      if (nextScroller !== scroller) {
        scroller?.removeEventListener('scroll', schedulePosition);
        scroller = nextScroller;
        scroller?.addEventListener('scroll', schedulePosition, { passive: true });
      }

      if (!scrolledForStep) {
        scrolledForStep = true;
        const narrow = window.innerWidth < NARROW_BREAKPOINT;
        const miniNav = target.closest('[data-tutorial-mini-nav]');
        const topPadding = HEADER_OFFSET + 16;
        const bottomPadding = narrow ? CALLOUT_BLOCK_ESTIMATE : 48;
        if (!(miniNav && target.getBoundingClientRect().top < 90)) {
          revealTargetInView(target, topPadding, bottomPadding);
        }
      }

      schedulePosition();
    };

    const hidden = { placement: 'bottom' as Placement, bubbleWidth: MAX_BUBBLE_WIDTH, visible: false };
    layoutRef.current = hidden;
    setLayout(hidden);
    const start = window.setTimeout(revealTarget, 40);
    const retry = window.setTimeout(revealTarget, 280);

    window.addEventListener('resize', schedulePosition);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearTimeout(retry);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedulePosition);
      scroller?.removeEventListener('scroll', schedulePosition);
    };
  }, [targetId, title, description, action, stepNumber]);

  if (typeof document === 'undefined' || dismissed) return null;

  const pointRight = layout.placement === 'left';
  const pointUp = layout.placement === 'bottom';
  const pointDown = layout.placement === 'top';

  return createPortal(
    <div
      ref={clusterRef}
      role="status"
      aria-live="polite"
      className="pointer-events-none"
      style={{
        position: 'absolute',
        top: 'var(--callout-top, -9999px)',
        left: 'var(--callout-left, 12px)',
        zIndex: 60,
        opacity: layout.visible ? 1 : 0,
        display: 'flex',
        flexDirection: pointUp ? 'column-reverse' : pointDown ? 'column' : pointRight ? 'row' : 'row-reverse',
        alignItems: 'center',
      }}
    >
      <div
        className="rounded-xl shadow-2xl relative"
        style={{
          width: layout.bubbleWidth,
          maxWidth: 'calc(100vw - 24px)',
          backgroundColor: BUBBLE_BG,
          pointerEvents: layout.visible ? 'auto' : 'none',
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
          transform: pointUp ? 'rotate(-90deg)' : pointDown ? 'rotate(90deg)' : pointRight ? 'none' : 'scaleX(-1)',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))',
          marginLeft: pointRight ? -2 : 0,
          marginRight: pointRight ? 0 : pointDown || pointUp ? 0 : -2,
          marginTop: pointDown ? -2 : 0,
          marginBottom: pointUp ? -2 : 0,
        }}
      >
        <path d="M2 11 H16 V4 L34 14 L16 24 V17 H2 Z" fill={GOLD} stroke={BUBBLE_BG} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>,
    document.body
  );
};

export default TutorialCallout;
