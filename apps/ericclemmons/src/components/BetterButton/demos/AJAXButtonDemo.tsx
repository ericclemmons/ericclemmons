import * as React from 'react';
import { Button } from './Button';

export default function AJAXButtonDemo() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      // @ts-expect-error Property 'elements' does not exist on type 'EventTarget'.
      if (event.target.elements.email.value === 'existing@example.com') {
        setError(new Error('You are already subscribed!'));
      } else {
        setSuccess(true);
      }

      setIsLoading(false);
    }, 2000);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <fieldset>
        <legend>
          Subscribe to our spam
        </legend>

        <label className="flex flex-col gap-2">
          <input className="flex-1 ring-1 p-2 rounded-md" type="email" name="email" placeholder="Email" defaultValue="existing@example.com" />
          {error && <p className="text-red-500 m-0 p-0">{error.message}</p>}
          {success && <p className="text-green-500 m-0 p-0">You are now subscribed!</p>}
        </label>
      </fieldset>

      {!success && (
        <Button disabled={isLoading || success} type="submit">
          {isLoading ? "Subscribing..." : 'Subscribe'}
        </Button>
      )}
    </form>
  )
}