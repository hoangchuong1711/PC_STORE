package com.pcstore.config;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;

@WebListener
public class PersistenceLifecycleListener implements ServletContextListener {
    @Override public void contextDestroyed(ServletContextEvent event) { JpaUtil.close(); }
}
