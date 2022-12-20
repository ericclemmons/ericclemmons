/** @jsxImportSource react */

import { qwikify$ } from "@builder.io/qwik-react";
import Home from "~/integrations/react/pages/Home";

export default qwikify$(Home, { eagerness: "visible" });
