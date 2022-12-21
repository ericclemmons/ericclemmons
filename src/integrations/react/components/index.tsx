/** @jsxImportSource react */

import { qwikify$ } from "@builder.io/qwik-react";
import { Header as ReactHeader } from "./Header";
import { Footer as ReactFooter } from "./Footer";
import { PostLayout as ReactPostLayout } from "./PostLayout";

export const Footer = qwikify$(ReactFooter);
export const Header = qwikify$(ReactHeader);
export const PostLayout = qwikify$(ReactPostLayout);
