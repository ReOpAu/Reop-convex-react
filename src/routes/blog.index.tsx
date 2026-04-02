import { Link, createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "~/components/layout/PublicLayout";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { loadBlogPosts } from "../lib/legacy-route-data";

export const Route = createFileRoute("/blog/")({
	loader: () => loadBlogPosts(),
	component: BlogIndex,
});

function BlogIndex() {
	const { posts } = Route.useLoaderData();

	return (
		<PublicLayout>
			<div className="container mx-auto max-w-5xl py-10">
				<h1 className="mb-10 text-4xl font-bold tracking-tight">Blog</h1>
				<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
					{posts.map((post) => (
						<Card
							key={post.slug}
							className="flex h-full flex-col justify-between transition-shadow hover:shadow-lg"
						>
							<CardHeader>
								<CardTitle className="mb-1 text-2xl font-semibold">
									{post.title}
								</CardTitle>
								<CardDescription>
									{new Date(post.publishedAt).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</CardDescription>
							</CardHeader>
							<CardContent className="flex-1 pb-0">
								<p className="line-clamp-3 text-base text-muted-foreground">
									{post.summary}
								</p>
							</CardContent>
							<CardFooter className="pt-4">
								<Button asChild variant="link" className="h-auto p-0 text-primary">
									<Link to="/blog/$slug" params={{ slug: post.slug }}>
										Read more &rarr;
									</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			</div>
		</PublicLayout>
	);
}
