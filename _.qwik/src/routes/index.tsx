/** @jsxImportSource react */

import { qwikify$ } from "@builder.io/qwik-react";
import ReactHomePage from "~/integrations/react/pages/Home";

import plan from "@qwik-city-plan";

export const HomePage = qwikify$(ReactHomePage, { eagerness: "visible" });

export default function HomeWithRoutes() {
  console.log(plan.routes);
  return <HomePage />;
}
