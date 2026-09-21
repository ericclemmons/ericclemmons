import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { Button } from './Button';


const queryClient = new QueryClient();

export default function TanStackQueryButtonDemo() {
  return (
    <QueryClientProvider client={queryClient}>
      <Demo />
    </QueryClientProvider>
  )
}

const Demo = () => {
  const { mutate, isPending, isSuccess, isError, error } = useMutation({
    mutationFn: async (event: React.SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();

      await new Promise(resolve => setTimeout(resolve, 3000));
      // @ts-expect-error Property 'email' does not exist on type 'HTMLFormControlsCollection'.
      if (event.target.elements.email.value === 'existing@example.com') {
        throw new Error('You are already subscribed!');
      }

      return { success: true };
    },
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={mutate}>
      <fieldset>
        <legend>
          Subscribe to our spam
        </legend>

        <label className="flex flex-col gap-2">
          <input className="flex-1 ring-1 p-2 rounded-md" type="email" name="email" placeholder="Email" defaultValue="existing@example.com" />
          {isError && <p className="text-red-500 m-0 p-0">{error.message}</p>}
          {isSuccess && <p className="text-green-500 m-0 p-0">You are now subscribed!</p>}
        </label>
      </fieldset>

      {!isSuccess && (
        <Button disabled={isPending} type="submit">
          {isPending ? "Subscribing..." : 'Subscribe'}
        </Button>
      )}
    </form>
  )
}