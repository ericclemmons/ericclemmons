import { component$ } from "@builder.io/qwik";
import { useDocumentHead, useLocation } from "@builder.io/qwik-city";

/**
 * The RouterHead component is placed inside of the document `<head>` element.
 */
export const RouterHead = component$(() => {
  const head = useDocumentHead();
  const loc = useLocation();

  return (
    <>
      <title>{head.title}</title>

      <link rel="canonical" href={loc.href} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link href="favicon.png" rel="icon" type="image/png" />

      {head.meta.map((m) => (
        <meta {...m} />
      ))}

      {head.links.map((l) => (
        <link {...l} />
      ))}

      {head.styles.map((s) => (
        <style {...s.props} dangerouslySetInnerHTML={s.style} />
      ))}

      <script
        dangerouslySetInnerHTML={`
            let darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

            updateMode()
            darkModeMediaQuery.addEventListener('change', updateModeWithoutTransitions)
            window.addEventListener('storage', updateModeWithoutTransitions)

            function updateMode() {
              let isSystemDarkMode = darkModeMediaQuery.matches
              let isDarkMode = window.localStorage.isDarkMode === 'true' || (!('isDarkMode' in window.localStorage) && isSystemDarkMode)

              if (isDarkMode) {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }

              if (isDarkMode === isSystemDarkMode) {
                delete window.localStorage.isDarkMode
              }
            }

            function disableTransitionsTemporarily() {
              document.documentElement.classList.add('[&_*]:!transition-none')
              window.setTimeout(() => {
                document.documentElement.classList.remove('[&_*]:!transition-none')
              }, 0)
            }

            function updateModeWithoutTransitions() {
              disableTransitionsTemporarily()
              updateMode()
            }
          `}
      />

      <link rel="alternate" type="application/rss+xml" href="/rss/feed.xml" />
      <link
        rel="alternate"
        type="application/feed+json"
        href="/rss/feed.json"
      />
    </>
  );
});
