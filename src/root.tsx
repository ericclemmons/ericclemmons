import { component$, useStyles$ } from "@builder.io/qwik";
import {
  QwikCityProvider,
  RouterOutlet,
  ServiceWorkerRegister,
} from "@builder.io/qwik-city";
import { Footer, Header } from "~/integrations/react";
import { Head } from "./components/Head";

import globalStyles from "./styles/global.css?inline";

import "focus-visible";

export default component$(() => {
  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Dont remove the `<head>` and `<body>` elements.
   */
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
        <div class="fixed inset-0 flex justify-center sm:px-8">
          <div class="flex w-full max-w-7xl lg:px-8">
            <div class="w-full bg-white ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-300/20" />
          </div>
        </div>

        <div class="relative">
          <Header />
          <main>
            <RouterOutlet />
          </main>
          {/* <Footer /> */}
        </div>

        <ServiceWorkerRegister />
      </body>
    </QwikCityProvider>
  );
});
