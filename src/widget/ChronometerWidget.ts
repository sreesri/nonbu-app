import type { ColorProp } from 'react-native-android-widget';

type ChronometerWidgetProps = {
  /** Epoch ms the bold H:MM:SS count-up starts from. */
  startedAt: number;
  style: { fontSize: number; color: ColorProp };
};

/**
 * A live H:MM:SS count-up that the launcher ticks every second, with no app wake-ups.
 * Not part of react-native-android-widget: native support comes from
 * patches/react-native-android-widget+*.patch, and the library's tree builder picks it up via
 * `__name__` / `convertProps`, the same contract its built-in widgets use.
 */
export function ChronometerWidget(_props: ChronometerWidgetProps): null {
  return null;
}

ChronometerWidget.__name__ = 'ChronometerWidget';
ChronometerWidget.convertProps = ({ startedAt, style }: ChronometerWidgetProps) => ({
  startedAt,
  fontSize: style.fontSize,
  color: style.color,
});
