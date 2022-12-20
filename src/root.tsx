import { component$, useStyles$ } from "@builder.io/qwik";
import {
  QwikCityProvider,
  RouterOutlet,
  ServiceWorkerRegister,
} from "@builder.io/qwik-city";
import { Head } from "./components/Head";

import globalStyles from "./styles/global.css?inline";

import "focus-visible";

export default component$(() => {
  useStyles$(globalStyles);

  return (
    <QwikCityProvider>
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />

        <Head />
      </head>
      <body
        class="h-full antialiased flex flex-col bg-zinc-50 dark:bg-black"
        lang="en"
      >
        <RouterOutlet />
        <ServiceWorkerRegister />
      </body>
    </QwikCityProvider>
  );
});
