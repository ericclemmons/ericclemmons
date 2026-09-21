import { Button } from "./Button";
import * as React from 'react'

const flip = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (Math.random() > 0.5) {
    return '🪙 Heads';
  }

  throw new Error('🪙 Tails');
}

const PromiseButton = ({ children, onClick, onLoading, onSuccess, onError }: React.ButtonHTMLAttributes<HTMLButtonElement> & { onLoading?: () => string, onSuccess?: (response: unknown) => React.ReactNode, onError?: (error: Error) => React.ReactNode }) => {
  const [label, setLabel] = React.useState(children);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setIsLoading(true);
    setLabel(onLoading?.());

    try {
      const response = await onClick?.(event);
      setLabel(onSuccess?.(response));
    } catch (error: unknown) {
      setLabel(onError?.(error as Error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {label}
    </Button>
  )
}


export default function PromiseButtonDemo() {
  return (
    <PromiseButton
      onClick={flip}
      onLoading={() => '🪙 Flipping...'}
      onSuccess={(message) => `${message}`}
      onError={(error) => `${(error as Error).message}`}
    >
      Flip a coin
    </PromiseButton>
  )
}