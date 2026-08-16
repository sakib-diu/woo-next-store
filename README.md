![GitHub license](https://img.shields.io/github/license/sakib-diu/woo-next-store)
![GitHub issues](https://img.shields.io/github/issues/sakib-diu/woo-next-store)
![GitHub stars](https://img.shields.io/github/stars/sakib-diu/woo-next-store)

# Vertex Store

Vertex Store is a modern, performance-optimized e-commerce store built with [Next.js](https://nextjs.org/) and integrated with [WooCommerce](https://woocommerce.com/). It provides a fast, scalable, and customizable solution for developers and businesses aiming to create high-performance online stores with modern UI/UX design.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Features

- ⚡ **Performance Optimized**: Built with Next.js 15.3+ and Turbopack for lightning-fast development
- 🛒 **WooCommerce Integration**: Seamless integration with WooCommerce REST API
- 💳 **Stripe Payments**: Complete payment processing with Stripe integration
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS and custom SCSS
- 📱 **Mobile-First**: Fully responsive design optimized for all devices
- 🔐 **Authentication**: User registration, login, and account management via WPGraphQL JWT, with email link-based password reset.
- 🛍️ **Shopping Features**: Cart, wishlist, compare products, and checkout
- 📊 **Dashboard**: Customer dashboard with order history and account management
- 🔍 **Search & Filter**: Advanced product search and filtering capabilities
- 🌙 **Dark Mode**: Theme switching support with next-themes
- ♿ **Accessibility**: Built with accessibility best practices

---

## Installation

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
- [pnpm](https://pnpm.io/) (preferred package manager)
- A running [WooCommerce](https://woocommerce.com/) instance with REST API enabled
- The [WPGraphQL](https://wordpress.org/plugins/wp-graphql/) plugin, active on the WordPress site. Signup (`registerUser`) and password reset (`sendPasswordResetEmail` / `resetUserPassword`) are core WPGraphQL mutations — no extra plugin needed for those.
- The [Simple JWT Login](https://wordpress.org/plugins/simple-jwt-login/) plugin, active, with its Authentication module enabled (Settings → Simple JWT Login → Authentication → "Allow Authentication"). This issues the JWT used for login — WPGraphQL itself has no `login` mutation, and the older "WPGraphQL JWT Authentication" plugin is no longer available on WordPress.org. Configure a `decryption_key` (HS256 secret) in its General settings and copy the same value into `WP_JWT_AUTH_SECRET` below, so the Next.js server can verify tokens it receives.
- In WordPress Settings → General, "Anyone can register" enabled and "New User Default Role" set to Customer, so self-registered users are created as real WooCommerce customers.

### Steps

1. **Clone the repository**:

   ```bash
   git clone https://github.com/sakib-diu/woo-next-store.git
   cd woo-next-store
   git checkout performance-optimization
   ```

2. **Install dependencies**:

   Using pnpm (recommended):

   ```bash
   pnpm install
   ```

   Or using npm:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   Create a `.env.local` file in the root directory and add your configuration:

   ```env
   # WordPress/WooCommerce Configuration
   WORDPRESS_SITE_URL=https://your-wordpress-site.com
   WC_CONSUMER_KEY=ck_your_consumer_key_here
   WC_CONSUMER_SECRET=cs_your_consumer_secret_here

   # Auth session (iron-session encryption key — generate your own, 32+ chars, keep secret)
   SESSION_SECRET=replace_with_a_random_32_plus_character_string

   # Must match the "decryption_key" set in the Simple JWT Login plugin's WP admin settings
   WP_JWT_AUTH_SECRET=replace_with_the_same_secret_configured_in_wp_admin

   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   
   # Optional: For direct WooCommerce API calls (if different from WordPress URL)
   WOOCOMMERCE_URL=https://your-woocommerce-site.com
   WOOCOMMERCE_KEY=ck_your_consumer_key_here
   WOOCOMMERCE_SECRET=cs_your_consumer_secret_here
   ```

   Signup and password reset talk to `${WORDPRESS_SITE_URL}/graphql` (requires WPGraphQL active). Login talks to `${WORDPRESS_SITE_URL}/wp-json/simple-jwt-login/v1/auth` (requires Simple JWT Login active, with Authentication enabled and its `decryption_key` matching `WP_JWT_AUTH_SECRET`) — see Prerequisites above.

4. **Start the development server**:

   Using pnpm:

   ```bash
   pnpm dev
   ```

   Or using npm:

   ```bash
   npm run dev
   ```

5. **Access the store**:

   Open your browser and visit `http://localhost:3000` to see the store in action.

**Platform Notes**: These instructions work across Windows, macOS, and Linux, as Next.js is platform-agnostic.

---

## Configuration

### Environment Variables

The project uses environment variables for configuration. Here are the required variables:

#### WordPress/WooCommerce API
- `WORDPRESS_SITE_URL`: Your WordPress site URL (e.g., `https://yourstore.com`). Also used as the base for the GraphQL endpoint (`${WORDPRESS_SITE_URL}/graphql`) used by authentication.
- `WC_CONSUMER_KEY`: Your WooCommerce API consumer key
- `WC_CONSUMER_SECRET`: Your WooCommerce API consumer secret

#### Authentication

- `SESSION_SECRET`: Random 32+ character string used by `iron-session` to encrypt the httpOnly session cookie. Generate your own per environment; never reuse across environments or commit it.
- `WP_JWT_AUTH_SECRET`: HS256 secret used to verify the JWT issued by the Simple JWT Login WordPress plugin. Must exactly match that plugin's `decryption_key` setting in wp-admin.

#### Stripe Payment Processing
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret

### WooCommerce Setup

1. **Enable REST API**: In your WooCommerce admin, go to WooCommerce > Settings > Advanced > REST API
2. **Create API Keys**: Generate consumer key and secret with read/write permissions
3. **Configure Permalinks**: Ensure WordPress permalinks are set to "Post name" or custom structure

### Stripe Webhook Configuration

For detailed Stripe webhook setup instructions, see [docs/stripe-webhook-setup.md](docs/stripe-webhook-setup.md).

---

## Usage

Once the server is running, access the store at `http://localhost:3000`. Key features include:

- **Homepage**: Featured products, categories, and promotional banners
- **Shop**: Browse all products with filtering and sorting options
- **Product Pages**: Detailed product information, variants, and reviews
- **Cart**: Add/remove items, apply coupons, and proceed to checkout
- **Checkout**: Secure payment processing with Stripe
- **User Account**: Registration, login, order history, and profile management
- **Dashboard**: Customer dashboard with order tracking and account settings

### Example Routes

- `/` - Homepage
- `/shop` - Product listing with filters
- `/product/[id]` - Individual product pages
- `/cart` - Shopping cart
- `/checkout` - Checkout process
- `/dashboard` - Customer dashboard
- `/login` - User login
- `/register` - User registration

---

## Project Structure

```
woo-next-store/
├── actions/                    # Server actions for data fetching
│   ├── auth-actions.ts         # Authentication actions
│   ├── products-actions.ts     # Product-related actions
│   ├── order-actions.ts        # Order management actions
│   └── ...
├── app/                        # Next.js app router pages
│   ├── shop/                 # Authentication pages
│   ├── cart/                   # Shopping cart
│   ├── checkout/               # Checkout process
│   ├── dashboard/              # Customer dashboard
│   ├── product/[id]/           # Dynamic product pages
│   └── ...
├── components/                 # Reusable React components
│   ├── Cart/                   # Cart components
│   ├── Header/                 # Header components
│   ├── Product/                # Product-related components
│   └── ...
├── context/                    # React context providers
├── lib/                        # Utility functions and configurations
├── styles/                     # SCSS stylesheets
├── types/                      # TypeScript type definitions
└── public/                     # Static assets
└── constant/                   # static data for the store/webiste
```

---

## Development

### Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production application
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Technology Stack

- **Framework**: Next.js 15.3+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom SCSS
- **UI Components**: Custom components with Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context + Server Components
- **Payment**: Stripe
- **E-commerce**: WooCommerce REST API
- **Package Manager**: pnpm

### Styling

The project uses a combination of:
- **Tailwind CSS**: Utility-first CSS framework
- **Custom SCSS**: Modular stylesheets in the `styles/` directory
- **CSS Variables**: Custom properties for consistent theming

---

## Contributing

We welcome contributions to Vertex Store! Here's how to get involved:

1. **Set up the development environment**:
   Follow the [Installation](#installation) steps above.

2. **Coding Standards**:
   - Use TypeScript for all new code
   - Follow the existing code style and patterns
   - Write descriptive commit messages
   - Ensure ESLint passes: `pnpm lint`

3. **Submitting Pull Requests**:
   - Fork the repository
   - Create a feature branch: `git checkout -b feature/your-feature`
   - Commit your changes: `git commit -m "feat: add your feature"`
   - Push to the branch: `git push origin feature/your-feature`
   - Submit a pull request with a detailed description

4. **Development Guidelines**:
   - Use server components where possible for better performance
   - Implement proper error handling and loading states
   - Ensure responsive design across all screen sizes
   - Test changes thoroughly before submitting

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for the full text.

---

## Contact

For support, questions, or contributions:

- **Issues**: [GitHub Issues](https://github.com/sakib-diu/woo-next-store/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sakib-diu/woo-next-store/discussions)
- **Email**: support@Vertex.com

---

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [WooCommerce](https://woocommerce.com/)
- Payments by [Stripe](https://stripe.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

Thank you for choosing Vertex Store! We hope it helps you build amazing e-commerce experiences.
