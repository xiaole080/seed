import { useState } from 'react';
import { clearWeatherCache } from '../../data/weatherCache';
import type { ConsentState, SelectedRegion } from '../../data/types';

interface UseProfileScreenParams {
  nickname: string;
  region: SelectedRegion;
  onChangeNickname?: (v: string) => void;
  onChangeRegion?: (r: SelectedRegion) => void;
  onChangeWeatherConsent?: (next: ConsentState['weatherApiConsent']) => void;
}

/**
 * ProfileScreen の画面レベル状態 (ニックネーム / 地域) と
 * 親への通知・副作用 (天気 OFF 時のキャッシュ削除) をまとめたフック。
 */
export function useProfileScreen({
  nickname,
  region,
  onChangeNickname,
  onChangeRegion,
  onChangeWeatherConsent,
}: UseProfileScreenParams) {
  const [nick, setNick] = useState(nickname);
  const [reg, setReg] = useState<SelectedRegion>(region);

  const onNickChange = (v: string) => {
    setNick(v);
    onChangeNickname?.(v);
  };

  const onRegionChange = (r: SelectedRegion) => {
    setReg(r);
    onChangeRegion?.(r);
  };

  const onWeatherChange = (next: ConsentState['weatherApiConsent']) => {
    if (next === 'declined') {
      // OFF にしたらキャッシュも消す (端末内ですぐ反映)
      clearWeatherCache();
    }
    onChangeWeatherConsent?.(next);
  };

  return { nick, onNickChange, reg, onRegionChange, onWeatherChange };
}
