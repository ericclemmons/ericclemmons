import * as React from 'react';
import { Button } from './Button';

export default function SPAButtonDemo() {
  const [count, setCount] = React.useState(0);

  return (
    <Button onClick={() => setCount(count + 1)}>
      👍 {count} Likes
    </Button>
  );
}