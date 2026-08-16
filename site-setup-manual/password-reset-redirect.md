# Password Reset Redirect (WordPress → Frontend)

Status: Done
Related areas: `app/reset-password/`, `app/forgot-password/`, `actions/auth-actions.ts`, WordPress `wp-content/mu-plugins/`

## Problem

`requestPasswordResetEmail()` in `actions/auth-actions.ts` calls WPGraphQL's stock
`sendPasswordResetEmail` mutation with only `username`. WPGraphQL forwards this to
WordPress core's `retrieve_password()`, which sends WordPress's **native** reset
email. That email's link points at:

```
{WORDPRESS_SITE_URL}/wp-login.php?action=rp&key=...&login=...
```

This is the WP admin login screen, not this app. It breaks the headless
architecture — users would leave the storefront and land on the WordPress
backend to reset their password, even though a working frontend page already
exists at `app/reset-password/page.tsx` (reads `key`/`login` from the query
string and calls `resetUserPassword` via `resetPasswordWithKey()`).

There is no `redirectTo`-style input on WPGraphQL's `sendPasswordResetEmail`
mutation, so this can't be fixed from the Next.js side alone — it requires a
WordPress-side filter to rewrite the emailed link.

## Fix

A WordPress **must-use plugin** hooks WordPress core's `retrieve_password_message`
filter and swaps the default `wp-login.php?action=rp` link for the frontend's
`/reset-password` route, keeping the same `key` and `login` query params so
`resetPasswordWithKey()` still works unchanged.

File (on the WordPress server, not in this repo):

```
wp-content/mu-plugins/headless-password-reset-redirect.php
```

```php
<?php
/**
 * Plugin Name: Headless Password Reset Redirect
 * Description: Rewrites the WP password-reset email link to point at the headless Next.js frontend instead of wp-login.php.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'retrieve_password_message',
	function ( $message, $key, $user_login, $user_data ) {
		$frontend_url = get_option( 'headless_frontend_reset_password_url' );

		if ( empty( $frontend_url ) ) {
			return $message;
		}

		$wp_reset_url = network_site_url( "wp-login.php?action=rp&key=$key&login=" . rawurlencode( $user_login ), 'login' );

		$frontend_reset_url = untrailingslashit( $frontend_url ) . '/reset-password?key=' . rawurlencode( $key ) . '&login=' . rawurlencode( $user_login );

		return str_replace( $wp_reset_url, $frontend_reset_url, $message );
	},
	10,
	4
);
```

`mu-plugins` is a core WordPress mechanism — always loaded, no activation
step, no dependency on any regular plugin (e.g. Novamira, which was only used
as the delivery mechanism to write this file and can be removed without
affecting it).

## Configuration

The frontend base URL is stored as a WordPress option, not hardcoded, so it
can be updated without touching the PHP file:

```
wp option update headless_frontend_reset_password_url https://your-frontend-domain
```

Current value (as of 2026-08-16): `https://helena-basilic-nonsalubriously.ngrok-free.dev`
(ngrok dev tunnel). **Update this to the production domain
(`https://zombie-store.vercel.com` or whatever it ends up being) before/at
launch** — the reset link will silently keep pointing at the ngrok tunnel
otherwise.

If the option is empty or unset, the filter is a no-op and WordPress falls
back to its native `wp-login.php` link — so it fails safe, not broken.

## Verification

Simulate the filter without sending a real email:

```php
$key = 'FAKEKEY123';
$user_login = 'testuser@example.com';
$sample_message = "...<" . network_site_url("wp-login.php?action=rp&key=$key&login=" . rawurlencode($user_login), 'login') . ">\n";
apply_filters( 'retrieve_password_message', $sample_message, $key, $user_login, null );
```

Expected output link: `{frontend_url}/reset-password?key=FAKEKEY123&login=testuser%40example.com`

To confirm end-to-end: trigger "forgot password" from `/forgot-password` in
the app, and check that the email link lands on this app's
`/reset-password` page instead of the WP login screen.
