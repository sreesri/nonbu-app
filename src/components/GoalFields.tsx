import { GOAL_FIELDS, type GoalDrafts, type NutritionGoal } from '@/lib/goals';
import { Field } from './ui';

/** Calorie and macro goal inputs; blank means no goal. */
export function GoalFields({
  drafts,
  onChange,
}: {
  drafts: GoalDrafts;
  onChange: (key: NutritionGoal, value: string) => void;
}) {
  return GOAL_FIELDS.map(({ key, label }) => (
    <Field
      key={key}
      label={label}
      value={drafts[key]}
      onChangeText={(v) => onChange(key, v)}
      keyboardType="decimal-pad"
      placeholder="Not set"
    />
  ));
}
