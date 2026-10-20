package com.pcstore.http;

import com.pcstore.entity.enums.UserRole;
import com.pcstore.filter.CorsFilter;
import com.pcstore.util.SessionUtil;
import jakarta.servlet.http.*;
import org.apache.catalina.startup.Tomcat;
import org.apache.tomcat.util.descriptor.web.FilterDef;
import org.apache.tomcat.util.descriptor.web.FilterMap;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.io.IOException;
import java.net.*;
import java.net.http.*;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class SessionCookieTest {
    @TempDir Path temp;

    @Test void sessionCookieSurvivesFrontendProxyPathAndRepeatedMeRequests() throws Exception {
        Tomcat tomcat = new Tomcat();
        tomcat.setBaseDir(temp.toString());
        tomcat.setPort(0);
        tomcat.getConnector().setProperty("address", "127.0.0.1");
        var context = tomcat.addContext("/pc-store-backend", temp.toString());
        context.setParentClassLoader(getClass().getClassLoader());
        context.addApplicationListener(com.pcstore.config.SessionCookieListener.class.getName());
        var def = new FilterDef(); def.setFilterName("cors"); def.setFilter(new CorsFilter()); context.addFilterDef(def);
        var map = new FilterMap(); map.setFilterName("cors"); map.addURLPattern("/*"); context.addFilterMap(map);
        Tomcat.addServlet(context, "session", new HttpServlet() {
            @Override protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
                SessionUtil.login(req, 42, UserRole.ADMIN);
                resp.setStatus(204);
            }
            @Override protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
                Integer id = SessionUtil.userId(req);
                resp.setStatus(id == null ? 401 : 200);
                resp.getWriter().write(String.valueOf(id));
            }
        });
        context.addServletMappingDecoded("/api/auth/*", "session");
        try {
            tomcat.start();
            String origin = "http://127.0.0.1:" + tomcat.getConnector().getLocalPort();
            try (var client = HttpClient.newHttpClient()) {
                var login = client.send(HttpRequest.newBuilder(URI.create(origin + "/pc-store-backend/api/auth/login"))
                    .POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
                assertEquals(204, login.statusCode());
                // Browser sees /api, while Next rewrites to /pc-store-backend/api.
                var cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
                cookies.put(URI.create(origin + "/api/auth/login"), login.headers().map());
                var headers = cookies.get(URI.create(origin + "/api/auth/me"), Map.of());
                String cookie = String.join("; ", headers.getOrDefault("Cookie", List.of()));
                assertTrue(cookie.contains("JSESSIONID="), "Browser must send session cookie on /api/auth/me; got " + login.headers().allValues("Set-Cookie"));
                for (int i = 0; i < 3; i++) {
                    var me = client.send(HttpRequest.newBuilder(URI.create(origin + "/pc-store-backend/api/auth/me"))
                        .header("Cookie", cookie).GET().build(), HttpResponse.BodyHandlers.ofString());
                    assertEquals(200, me.statusCode());
                    assertEquals("42", me.body());
                }
            }
        } finally { tomcat.stop(); tomcat.destroy(); }
    }
}
