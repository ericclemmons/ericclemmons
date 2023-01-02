declare module 'astro:content' {
	export { z } from 'astro/zod';
	export type CollectionEntry<C extends keyof typeof entryMap> =
		typeof entryMap[C][keyof typeof entryMap[C]] & Render;

	type BaseCollectionConfig<S extends import('astro/zod').ZodRawShape> = {
		schema?: S;
		slug?: (entry: {
			id: CollectionEntry<keyof typeof entryMap>['id'];
			defaultSlug: string;
			collection: string;
			body: string;
			data: import('astro/zod').infer<import('astro/zod').ZodObject<S>>;
		}) => string | Promise<string>;
	};
	export function defineCollection<S extends import('astro/zod').ZodRawShape>(
		input: BaseCollectionConfig<S>
	): BaseCollectionConfig<S>;

	export function getEntry<C extends keyof typeof entryMap, E extends keyof typeof entryMap[C]>(
		collection: C,
		entryKey: E
	): Promise<typeof entryMap[C][E] & Render>;
	export function getCollection<
		C extends keyof typeof entryMap,
		E extends keyof typeof entryMap[C]
	>(
		collection: C,
		filter?: (data: typeof entryMap[C][E]) => boolean
	): Promise<(typeof entryMap[C][E] & Render)[]>;

	type InferEntrySchema<C extends keyof typeof entryMap> = import('astro/zod').infer<
		import('astro/zod').ZodObject<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type Render = {
		render(): Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			injectedFrontmatter: Record<string, any>;
		}>;
	};

	const entryMap: {
		"blog": {
"3-ways-to-define-webpack-loaders.mdx": {
  id: "3-ways-to-define-webpack-loaders.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-1.mdx": {
  id: "advent-of-javascript/day-1.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-10.mdx": {
  id: "advent-of-javascript/day-10.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-17.mdx": {
  id: "advent-of-javascript/day-17.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-2.mdx": {
  id: "advent-of-javascript/day-2.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-3.mdx": {
  id: "advent-of-javascript/day-3.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-4.mdx": {
  id: "advent-of-javascript/day-4.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-5.mdx": {
  id: "advent-of-javascript/day-5.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-6.mdx": {
  id: "advent-of-javascript/day-6.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-7.mdx": {
  id: "advent-of-javascript/day-7.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-8.mdx": {
  id: "advent-of-javascript/day-8.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"advent-of-javascript/day-9.mdx": {
  id: "advent-of-javascript/day-9.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"angular-trust-filter.mdx": {
  id: "angular-trust-filter.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"circular-dependencies-in-node.mdx": {
  id: "circular-dependencies-in-node.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"copying-databases-in-node.mdx": {
  id: "copying-databases-in-node.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"dogfooding-your-open-source-projects.mdx": {
  id: "dogfooding-your-open-source-projects.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"filesystem-routers-and-indexes.mdx": {
  id: "filesystem-routers-and-indexes.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"give-back-friday-or-refactor-friday.mdx": {
  id: "give-back-friday-or-refactor-friday.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"graphql-context-services.mdx": {
  id: "graphql-context-services.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"hydra-a-precursor-to-graphql.mdx": {
  id: "hydra-a-precursor-to-graphql.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"i-ditched-my-iphone-for-the-google-pixel.mdx": {
  id: "i-ditched-my-iphone-for-the-google-pixel.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"javascript-fatigue.mdx": {
  id: "javascript-fatigue.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"jest-snapshots-for-storybook.mdx": {
  id: "jest-snapshots-for-storybook.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"react-event-preventdefault.mdx": {
  id: "react-event-preventdefault.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"resume-tips-for-programmers.mdx": {
  id: "resume-tips-for-programmers.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"simple-node-cluster.mdx": {
  id: "simple-node-cluster.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"teaching-react-without-using-react.mdx": {
  id: "teaching-react-without-using-react.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"track-commits-not-time.mdx": {
  id: "track-commits-not-time.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"using-html5-not-hash-routes.mdx": {
  id: "using-html5-not-hash-routes.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"why-i-am-terrible-at-finishing.mdx": {
  id: "why-i-am-terrible-at-finishing.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"why-i-don-t-support-windows.mdx": {
  id: "why-i-don-t-support-windows.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"work-on-features-not-repositories.mdx": {
  id: "work-on-features-not-repositories.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"write-functional-tests-and-assertions.mdx": {
  id: "write-functional-tests-and-assertions.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
"writing-paralysis.mdx": {
  id: "writing-paralysis.mdx",
  slug: string,
  body: string,
  collection: "blog",
  data: InferEntrySchema<"blog">
},
},

	};

	type ContentConfig = typeof import("./config");
}