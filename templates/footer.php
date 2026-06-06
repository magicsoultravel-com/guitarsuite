</main>
<footer>
    &copy; <?= date('Y') ?> minimal website design inc.<br><br>

    <div class="bottom-login-status">
        <?php if ($isLoggedIn): ?>
            <?php if (is_admin()): // Assuming is_admin() is defined in auth.php and requires session ?>
                <nav class="admin-nav">
                    <?php
                    // Dynamically generate the correct path for the Admin Panel link.
                    // This creates a root-relative path like /minimal/admin/panel.php
                    $adminPanelLink = dirname($_SERVER['SCRIPT_NAME']) . '/admin/panel.php';
                    ?>
                    <a href="<?= htmlspecialchars($adminPanelLink) ?>">Admin Panel</a>
                </nav>
            <?php endif; ?>

            <div class="user-status">
                Status: Logged in as <?= htmlspecialchars($email) ?> |
                <?php
                // Dynamically generate the correct path for the Logout link.
                // This creates a root-relative path like /minimal/auth/logout.php
                $logoutLink = dirname($_SERVER['SCRIPT_NAME']) . '/auth/logout.php';
                ?>
                <a href="<?= htmlspecialchars($logoutLink) ?>">Logout</a>
            </div>
        <?php else: ?>

            <?php
            // Dynamically generate the correct form action path for login.
            // This creates a root-relative path like /minimal/auth/login.php
            $formActionPath = dirname($_SERVER['SCRIPT_NAME']) . '/auth/login.php';
            ?>
            <form class="login-form" method="post" action="<?= htmlspecialchars($formActionPath) ?>" autocomplete="off">
                <input type="email" name="email" placeholder="Email" required />
                <input type="password" name="password" placeholder="Password" required />
                <button type="submit">Login</button>
            </form>

            <div class="user-status">
                Status: Logged out
            </div>
        <?php endif; ?>
    </div>
</footer>

</body>

</html>