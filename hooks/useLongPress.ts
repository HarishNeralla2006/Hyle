import { useCallback, useRef, MouseEvent, TouchEvent } from 'react';

type LongPressOptions = {
  shouldPreventDefault?: boolean;
  delay?: number;
};

const useLongPress = (
  onLongPress: () => void,
  onClick: () => void,
  { shouldPreventDefault = true, delay = 300 }: LongPressOptions = {}
) => {
  // Fix: Initialize useRef with null to resolve "Expected 1 arguments, but got 0" error.
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fix: Initialize useRef with null to resolve "Expected 1 arguments, but got 0" error.
  const target = useRef<EventTarget | null>(null);

  const start = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, { passive: false });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress();
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: MouseEvent | TouchEvent, shouldTriggerClick = true) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
        if(shouldTriggerClick){
            onClick();
        }
      }
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [onClick, shouldPreventDefault]
  );
  
  const preventDefault = (e: Event) => {
    if (!('touches' in e) || ((e as unknown as TouchEvent).touches.length < 2)) {
      e.preventDefault();
    }
  };

  return {
    onMouseDown: (e: MouseEvent) => start(e),
    onTouchStart: (e: TouchEvent) => start(e),
    onMouseUp: (e: MouseEvent) => clear(e),
    onMouseLeave: (e: MouseEvent) => clear(e, false),
    onTouchEnd: (e: TouchEvent) => clear(e),
  };
};

export default useLongPress;