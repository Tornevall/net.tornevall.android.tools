package net.tornevall.android.tools

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import com.google.android.material.navigation.NavigationView
import androidx.core.os.bundleOf
import androidx.navigation.findNavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.navOptions
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.navigateUp
import androidx.navigation.ui.setupActionBarWithNavController
import androidx.navigation.ui.setupWithNavController
import androidx.appcompat.app.AppCompatActivity
import net.tornevall.android.tools.accessibility.ToolsReaderAccessibilityService
import net.tornevall.android.tools.databinding.ActivityMainBinding
import net.tornevall.android.tools.ui.socialgpt.SocialGptFragment

class MainActivity : AppCompatActivity() {

    private lateinit var appBarConfiguration: AppBarConfiguration
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.appBarMain.toolbar)


        val navHostFragment =
            (supportFragmentManager.findFragmentById(R.id.nav_host_fragment_content_main) as NavHostFragment?)!!
        val navController = navHostFragment.navController

        binding.navView?.let {
            appBarConfiguration = AppBarConfiguration(
                setOf(
                    R.id.nav_socialgpt, R.id.nav_settings
                ),
                binding.drawerLayout
            )
            setupActionBarWithNavController(navController, appBarConfiguration)
            it.setupWithNavController(navController)
        }

        binding.appBarMain.contentMain.bottomNavView?.let {
            appBarConfiguration = AppBarConfiguration(
                setOf(
                    R.id.nav_socialgpt
                )
            )
            setupActionBarWithNavController(navController, appBarConfiguration)
            it.setupWithNavController(navController)
        }

        handleSharedTextIntent(intent, navController)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val navController = findNavController(R.id.nav_host_fragment_content_main)
        handleSharedTextIntent(intent, navController)
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        val result = super.onCreateOptionsMenu(menu)
        // Using findViewById because NavigationView exists in different layout files
        // between w600dp and w1240dp
        val navView: NavigationView? = findViewById(R.id.nav_view)
        if (navView == null) {
            // The navigation drawer already has the items including the items in the overflow menu
            // We only inflate the overflow menu if the navigation drawer isn't visible
            menuInflater.inflate(R.menu.overflow, menu)
        }
        return result
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        when (item.itemId) {
            R.id.nav_settings -> {
                val navController = findNavController(R.id.nav_host_fragment_content_main)
                navController.navigate(R.id.nav_settings)
            }
        }
        return super.onOptionsItemSelected(item)
    }

    override fun onSupportNavigateUp(): Boolean {
        val navController = findNavController(R.id.nav_host_fragment_content_main)
        return navController.navigateUp(appBarConfiguration) || super.onSupportNavigateUp()
    }

    private fun handleSharedTextIntent(intent: Intent?, navController: androidx.navigation.NavController) {
        val shouldOpenReply = intent?.getBooleanExtra(
            ToolsReaderAccessibilityService.EXTRA_OPEN_REPLY_HELPER,
            false
        ) == true
        val shouldAutoVerify = intent?.getBooleanExtra(
            ToolsReaderAccessibilityService.EXTRA_AUTO_VERIFY,
            false
        ) == true

        if (!shouldOpenReply && (intent?.action != Intent.ACTION_SEND || intent.type != "text/plain")) {
            return
        }

        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
        val args = bundleOf(
            SocialGptFragment.ARG_SHARED_TEXT to sharedText,
            SocialGptFragment.ARG_AUTO_VERIFY to shouldAutoVerify
        )

        if (sharedText.isNotBlank()) {
            navController.navigate(
                R.id.nav_socialgpt,
                args,
                navOptions {
                    launchSingleTop = true
                }
            )
        } else if (shouldOpenReply) {
            navController.navigate(
                R.id.nav_socialgpt,
                args,
                navOptions {
                    launchSingleTop = true
                }
            )
        }

        intent.action = Intent.ACTION_MAIN
        intent.removeExtra(Intent.EXTRA_TEXT)
        intent.removeExtra(ToolsReaderAccessibilityService.EXTRA_OPEN_REPLY_HELPER)
        intent.removeExtra(ToolsReaderAccessibilityService.EXTRA_AUTO_VERIFY)
    }
}