import * as React from 'react';

export const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button className="bg-primary-600 text-white px-4 py-2 rounded-md disabled:opacity-80 disabled:cursor-not-allowed text-shadow-2xs tabular-nums" {...props}>
      {props.children}
    </button>
  );
}
