<?php
/**
 * Candy Era Child Theme — functions.php
 * Child of Hello Elementor. Fully compatible with Elementor, Elementor Pro, WooCommerce, and Stripe.
 */

defined('ABSPATH') || exit;

/* ─────────────────────────────────────────────
   1. ENQUEUE PARENT + CHILD STYLES
───────────────────────────────────────────── */
add_action('wp_enqueue_scripts', 'candy_era_child_enqueue', 20);
function candy_era_child_enqueue() {
    // Parent theme stylesheet
    wp_enqueue_style(
        'hello-elementor-parent',
        get_template_directory_uri() . '/style.css',
        [],
        wp_get_theme('hello-elementor')->get('Version')
    );

    // Child theme stylesheet (auto-versioned from file mod time)
    wp_enqueue_style(
        'candy-era-child',
        get_stylesheet_uri(),
        ['hello-elementor-parent'],
        filemtime(get_stylesheet_directory() . '/style.css')
    );

    // Child JS (smooth animations, scroll effects)
    wp_enqueue_script(
        'candy-era-child-js',
        get_stylesheet_directory_uri() . '/assets/js/candy-era.js',
        [],
        filemtime(get_stylesheet_directory() . '/assets/js/candy-era.js'),
        true  // load in footer
    );
}

/* ─────────────────────────────────────────────
   2. THEME SETUP
───────────────────────────────────────────── */
add_action('after_setup_theme', 'candy_era_child_setup');
function candy_era_child_setup() {
    // Make sure WooCommerce thumbnails look sharp
    add_theme_support('woocommerce', [
        'thumbnail_image_width'  => 480,
        'single_image_width'     => 720,
        'product_grid'           => [
            'default_rows'    => 3,
            'min_rows'        => 1,
            'default_columns' => 4,
            'min_columns'     => 1,
            'max_columns'     => 6,
        ],
    ]);

    add_theme_support('wc-product-gallery-zoom');
    add_theme_support('wc-product-gallery-lightbox');
    add_theme_support('wc-product-gallery-slider');
}

/* ─────────────────────────────────────────────
   3. STRIPE COMPATIBILITY CHECK
   Checks Stripe for WooCommerce is active and
   shows an admin notice if it's missing.
───────────────────────────────────────────── */
add_action('admin_notices', 'candy_era_stripe_check');
function candy_era_stripe_check() {
    // Only show to admins on WooCommerce pages
    if (!current_user_can('manage_options')) return;

    $stripe_plugins = [
        'woocommerce-stripe-gateway/woocommerce-gateway-stripe.php', // Official Stripe plugin
        'woocommerce-gateway-stripe/woocommerce-gateway-stripe.php', // Alt path
    ];

    $stripe_active = false;
    foreach ($stripe_plugins as $plugin) {
        if (is_plugin_active($plugin)) {
            $stripe_active = true;
            break;
        }
    }

    if (!$stripe_active) {
        echo '<div class="notice notice-warning is-dismissible">';
        echo '<p><strong>Candy Era:</strong> The WooCommerce Stripe plugin does not appear to be active. ';
        echo 'Please install/activate <em>WooCommerce Stripe Payment Gateway</em> to accept card payments. ';
        echo '<a href="' . esc_url(admin_url('plugin-install.php?s=woocommerce+stripe&tab=search&type=term')) . '">Install it here</a>.';
        echo '</p></div>';
    }
}

/* ─────────────────────────────────────────────
   4. CLEAN UP WORDPRESS HEAD (PERFORMANCE)
───────────────────────────────────────────── */
remove_action('wp_head', 'wp_generator');                // Hide WP version
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wp_shortlink_wp_head');

/* ─────────────────────────────────────────────
   5. BODY CLASSES — for CSS targeting
───────────────────────────────────────────── */
add_filter('body_class', 'candy_era_body_classes');
function candy_era_body_classes($classes) {
    $classes[] = 'candy-era-redesign';
    if (is_woocommerce() || is_cart() || is_checkout()) {
        $classes[] = 'candy-era-shop';
    }
    return $classes;
}

/* ─────────────────────────────────────────────
   6. WOOCOMMERCE — HIDE DEFAULT ELEMENTOR
   WRAPPER THAT DUPLICATES WC PAGE TITLE
───────────────────────────────────────────── */
add_filter('woocommerce_show_page_title', '__return_false');
