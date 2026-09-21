import * as React from 'react'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const query = useQuery({
    enabled: false,
    queryFn: async ({ signal }) => {
      const { promise, resolve } = Promise.withResolvers();

      signal.addEventListener('abort', () => {
        throw new Error('Cancelled');
      });

      setTimeout(() => {
        if (signal.aborted) {
          throw new Error('Cancelled');
        }

        resolve({ success: true });
      }, 2000);

      return promise;
    },
    queryKey: ['download'],
  });

  return (
    <form className="flex flex-col" onSubmit={(event) => {
      event.preventDefault();

      if (query.isFetching) {
        queryClient.cancelQueries({ queryKey: ['download'] })
      } else {
        query.refetch();
      }
    }}>
      <Button>
        {query.isFetching ? '🛑 Cancel...' : '📥 The.Matrix.Reloaded.2003.DVDRip.XviD-DEViSE.avi.exe'}
      </Button>
    </form>
  )
}