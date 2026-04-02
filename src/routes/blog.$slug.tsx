import ReactMarkdown from "react-markdown";
import {
	Link,
	createFileRoute,
	notFound,
} from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { loadBlogPost } from "../lib/legacy-route-data";

export const Route = createFileRoute("/blog/$slug")({
	loader: async ({ params }) => {
		if (!params.slug) {
			throw notFound();
		}

		const { post } = await loadBlogPost({
			data: { slug: params.slug },
		});

		if (!post) {
			throw notFound();
		}

		return { post };
	},
	component: BlogPost,
});

function BlogPost() {
	const { post } = Route.useLoaderData();

	return (
		<PublicLayout>
			<div className="container mx-auto max-w-3xl py-12">
				<Button asChild variant="link" className="mb-6 h-auto p-0 text-primary">
					<Link to="/blog">&larr; Back to blog</Link>
				</Button>
				<Card className="prose prose-lg max-w-none w-full">
					<CardHeader>
						<CardTitle className="mb-2 text-4xl font-bold leading-tight">
							{post.title}
						</CardTitle>
						<CardDescription className="text-base">
							{new Date(post.publishedAt).toLocaleDateString("en-US", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ReactMarkdown>{post.content}</ReactMarkdown>
					</CardContent>
				</Card>
			</div>
		</PublicLayout>
	);
}
