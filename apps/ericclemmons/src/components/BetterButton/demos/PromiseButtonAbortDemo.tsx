import { Button } from './Button';
import * as React from 'react'

export default function PromiseButtonAbortDemo() {
  return (
    <PromiseButton
      onClick={async (event, { signal }) => {
        event.preventDefault();


        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true };
      }}
      onLoading={() => ({ children: '🪙 Flipping...', disabled: true })}
      onSuccess={(message) => ({ children: `${message}`, disabled: false })}
      onError={(error) => ({ className: 'text-red-500', children: `${(error as Error).message}. All done.` })}
    >
      📥 The.Matrix.Reloaded.2003.DVDRip.XviD-DEViSE.avi.exe
    </PromiseButton>
  )
}

type PromiseButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onClick: (event: React.MouseEvent<HTMLButtonElement>, { signal }: { signal: AbortSignal }) => Promise<{ success: boolean }>
  onLoading?: () => { children?: React.ReactNode }
  onSuccess?: (response: unknown) => { children?: React.ReactNode }
  onError?: (error: Error) => { children?: React.ReactNode }
}

const PromiseButton = (originalProps: PromiseButtonProps) => {
  const [{ onLoading, onSuccess, onError, ...props }, setProps] = React.useState(originalProps);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const controller = new AbortController();
    const { signal } = controller;

    setProps((prev) => ({ ...prev, ...prev.onLoading?.() }));

    try {
      const response = await props.onClick?.(event, { signal });
      setProps((prev) => ({ ...prev, ...prev.onSuccess?.(response) }));
    } catch (error: unknown) {
      setProps((prev) => ({ ...prev, ...prev.onError?.(error as Error) }));
    }
  }

  return (
    <Button {...props} onClick={handleClick} />
  )
}
