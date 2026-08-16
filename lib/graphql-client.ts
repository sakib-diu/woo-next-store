const wordpressSiteUrl = process.env.WORDPRESS_SITE_URL;

if (!wordpressSiteUrl) {
    throw new Error("WORDPRESS_SITE_URL is not defined in environment variables");
}

const graphqlEndpoint = `${wordpressSiteUrl}/graphql`;

export interface GraphQLError {
    message: string;
}

export async function graphqlRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
    authToken?: string
): Promise<{ data?: T; errors?: GraphQLError[] }> {
    try {
        const response = await fetch(graphqlEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ query, variables }),
            cache: "no-store",
        });

        const json = await response.json();
        return json;
    } catch (error) {
        console.error("GraphQL request failed:", error);
        return { errors: [{ message: "Could not connect to the server. Please try again." }] };
    }
}
