/** @jsxImportSource react */

import { Container } from "./Container";

function NavLink({ href, children }) {
  return (
    <a
      href={href}
      class="hover:text-fuchsia-500 dark:hover:text-fuchsia-400 transition"
    >
      {children}
    </a>
  );
}

export function Footer() {
  return (
    <footer class="mt-32">
      <Container.Outer>
        <div class="border-zinc-100 dark:border-zinc-700/40 border-t pt-10 pb-16">
          <Container.Inner>
            <div class="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div class="text-zinc-800 dark:text-zinc-200 flex gap-6 text-sm font-medium">
                <NavLink href="/about">About</NavLink>
                <NavLink href="/projects">Projects</NavLink>
                <NavLink href="/speaking">Speaking</NavLink>
                <NavLink href="/uses">Uses</NavLink>
              </div>
              <p class="text-zinc-400 dark:text-zinc-500 text-sm">
                &copy; {new Date().getFullYear()} Eric Clemmons. All rights
                reserved.
              </p>
            </div>
          </Container.Inner>
        </div>
      </Container.Outer>
    </footer>
  );
}
