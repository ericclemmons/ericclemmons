import { Button } from "./Button";
import { toast, Toaster } from "sonner";

const flip = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (Math.random() > 0.5) {
    return '🪙 Heads';
  }

  throw new Error('🪙 Tails');
}

export default function SonnerDemo() {
  return (
    <>
      <Toaster />

      <Button onClick={() => {
        toast.promise(flip(), {
          loading: '🪙 Flipping...',
          success: (response) => response,
          error: (error) => error.message,
        });
      }}>
        Flip a coin
      </Button>
    </>
  )
}