import { Typography } from '@knittotextile/react-ui';

export default function FeedbackError({ text }: { text: string }) {
  if (!text) return null;
  return (
    <Typography as="global-hint" className="text-red-500 dark:text-red-400 mt-0.5">
      {text}
    </Typography>
  );
}
