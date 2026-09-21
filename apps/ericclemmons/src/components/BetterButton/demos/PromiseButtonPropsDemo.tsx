import { Button } from "./Button";
import * as React from 'react'

export default function PromiseButtonDemo() {
  return (
    <PromiseButton
      onClick={flip}
      onLoading={() => ({ children: '🪙 Flipping...', disabled: true })}
      onSuccess={(message) => ({ children: `${message}`, disabled: false })}
      onError={(error) => ({ className: 'text-red-500', children: `${(error as Error).message}. All done.` })}
    >
      Flip a coin
    </PromiseButton>
  )
}

const flip = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (Math.random() > 0.5) {
    return '🪙 Heads';
  }

  throw new Error('🪙 Tails');
}

type PromiseButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  onLoading?: () => { children?: React.ReactNode }
  onSuccess?: (response: unknown) => { children?: React.ReactNode }
  onError?: (error: Error) => { children?: React.ReactNode }
}

const PromiseButton = (originalProps: PromiseButtonProps) => {
  const [{ onLoading, onSuccess, onError, ...props }, setProps] = React.useState(originalProps);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setProps((prev) => ({ ...prev, ...prev.onLoading?.() }));

    try {
      const response = await props.onClick?.(event);
      setProps((prev) => ({ ...prev, ...prev.onSuccess?.(response) }));
    } catch (error: unknown) {
      setProps((prev) => ({ ...prev, ...prev.onError?.(error as Error) }));
    }
  }

  return (
    <Button {...props} onClick={handleClick} />
  )
}


