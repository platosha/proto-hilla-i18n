import {
  AppLayout,
  DrawerToggle,
  ProgressBar,
  SideNav,
  SideNavItem,
} from "@vaadin/react-components";
import {
  createMenuItems,
  useViewConfig,
} from "@vaadin/hilla-file-router/runtime.js";
import {Suspense, useEffect} from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Signal, signal, effect } from '@vaadin/hilla-react-signals';
import {i18n} from "@vaadin/hilla-react-i18n";

const vaadin = window.Vaadin as {
  documentTitleSignal: Signal<string>;
};
vaadin.documentTitleSignal = signal("");
effect(() => {
  document.title = vaadin.documentTitleSignal.value;
});

declare module "@vaadin/hilla-react-i18n" {

}

await i18n.configure({language: "en"});

export default function MainLayout() {
  const currentTitle = useViewConfig()?.title ?? '';
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    vaadin.documentTitleSignal.value = currentTitle;
  })

  return (
      <AppLayout primarySection="drawer">
        <div slot="drawer" className="flex flex-col justify-between h-full p-m">
          <header className="flex flex-col gap-m">
            <h1 className="text-l m-0">{vaadin.documentTitleSignal}</h1>
            <SideNav
                onNavigate={({path}) => navigate(path!)}
                location={location}
            >
              {createMenuItems().concat([
                { to: '/about', title: 'About' },
              ]).map(({to, title}) => (
                  <SideNavItem path={to} key={to}>
                    {title}
                  </SideNavItem>
              ))}
            </SideNav>
          </header>
        </div>

        <DrawerToggle slot="navbar" aria-label="Menu toggle"></DrawerToggle>
        <h2 slot="navbar" className="text-l m-0">
          {vaadin.documentTitleSignal}
        </h2>

        <Suspense fallback={<ProgressBar indeterminate className="m-0"/>}>
          <section className="view">
            <Outlet/>
          </section>
        </Suspense>
      </AppLayout>
  );
}
