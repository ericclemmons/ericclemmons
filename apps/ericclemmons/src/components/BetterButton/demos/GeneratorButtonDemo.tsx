import { Button } from './Button';
import * as React from 'react'

export default function PromiseButtonAbortDemo() {
  return (
    <PromiseButton
      onClick={async function* (event) {
        yield {
          children: '🛑 Cancel...', onClick() {
            throw new Error('Cancelled');
          }
        };
        await new Promise(resolve => setTimeout(resolve, 2000));
        yield { children: '✅ Virus installed!' }
      }}
    >
      📥 The.Matrix.Reloaded.2003.DVDRip.XviD-DEViSE.avi.exe
    </PromiseButton>
  )
}

type PromiseButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => AsyncIterable<Partial<PromiseButtonProps>>
}

const PromiseButton = (initialProps: PromiseButtonProps) => {
  const [props, setProps] = React.useState({ ...initialProps });

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!props.onClick) {
      return;
    }

    for await (const nextProps of props.onClick(event)) {
      setProps((prev) => ({ ...prev, ...nextProps }));
    }
  }

  return (
    <Button {...props} onClick={handleClick} />
  )
}
