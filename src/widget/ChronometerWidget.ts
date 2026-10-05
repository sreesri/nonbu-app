import type { ColorProp } from 'react-native-android-widget';

type ChronometerWidgetProps = {
  /** Epoch ms at which the clock reads 0:00:00. */
  base: number;
  /** Count down towards `base` instead of up from it. */
  countDown?: boolean;
  /** Text before the H:MM:SS value, e.g. "+". */
  prefix?: string;
  style: { fontSize: number; color: ColorProp };
};

/**
 * A live, bold H:MM:SS clock that the launcher ticks every second, with no app wake-ups.
 * Not part of react-native-android-widget: native support comes from
 * patches/react-native-android-widget+*.patch, and the library's tree builder picks it up via
 * `__name__` / `convertProps`, the same contract its built-in widgets use.
 */
export function ChronometerWidget(_props: ChronometerWidgetProps): null {
  return null;
}

ChronometerWidget.__name__ = 'ChronometerWidget';
ChronometerWidget.convertProps = ({ base, countDown = false, prefix = '', style }: ChronometerWidgetProps) => ({
  base,
  countDown,
  // Chronometer substitutes the value for %s; escape any literal % in the prefix.
  format: `${prefix.replaceAll('%', '%%')}%s`,
  fontSize: style.fontSize,
  color: style.color,
});
