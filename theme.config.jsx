import { CodeSandbox } from "mdx-embed/dist/components/codesandbox";
import { Gist } from "mdx-embed/dist/components/gist";
import { Tweet } from "mdx-embed/dist/components/twitter";
import { YouTube } from "mdx-embed/dist/components/youtube";
import Script from "next/script";

/**
 * @type {import("nextra-theme-docs").DocsThemeConfig}
 */
export default {
  logo: <span>Eric Clemmons</span>,
  project: {
    link: "https://github.com/ericclemmons/ericclemmons",
  },
  nextThemes: {
    defaultTheme: "dark",
  },
  docsRepositoryBase: "https://github.com/ericclemmons/ericclemmons/tree/main",
  components: {
    CodeSandbox,
    Gist,
    Script,
    Tweet(props) {
      return (
        <Tweet align="center" hideConversation={true} theme="dark" {...props} />
      );
    },
    YouTube,
  },
};
