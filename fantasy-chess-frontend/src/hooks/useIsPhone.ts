import { useEffect, useState } from 'react';

const PHONE_QUERY = '(max-width: 1023px)';

export const useIsPhone = () => {
  const [isPhone, setIsPhone] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(PHONE_QUERY).matches : false
  );

  useEffect(() => {
    const media = window.matchMedia(PHONE_QUERY);
    const update = () => setIsPhone(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isPhone;
};
