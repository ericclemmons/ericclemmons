import { component$, Slot } from "@builder.io/qwik";
import { PostLayout } from "~/integrations/react/components";

// export default (props) => <PostLayout meta={meta} {...props} />;

export default component$((props) => {
  console.log({ props }, props.meta);
  return <Slot />;
});
