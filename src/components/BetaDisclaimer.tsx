"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const MODAL_STORAGE_KEY = "beta-disclaimer-dismissed";
const BANNER_STORAGE_KEY = "beta-banner-dismissed";
const SOURCE_URL =
  "https://mvr.bg/upload/289359/Списък+на+колективни+средства+за+защита.pdf";

export default function BetaDisclaimer() {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const modalDismissed = localStorage.getItem(MODAL_STORAGE_KEY);
    if (!modalDismissed) {
      setShowModal(true);
    }
    const bannerDismissed = sessionStorage.getItem(BANNER_STORAGE_KEY);
    if (!bannerDismissed) {
      setShowBanner(true);
    }
  }, []);

  const dismissModal = () => {
    localStorage.setItem(MODAL_STORAGE_KEY, "true");
    setShowModal(false);
  };

  const dismissBanner = () => {
    sessionStorage.setItem(BANNER_STORAGE_KEY, "true");
    setShowBanner(false);
  };

  return (
    <>
      {showBanner && (
        <div className="absolute top-0 left-0 right-0 z-[1001] flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800">
          <span>{t("betaBanner")}</span>
          <button
            onClick={dismissBanner}
            className="ml-auto shrink-0 p-0.5 text-amber-600 hover:text-amber-800 cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-800">
              {t("betaModalTitle")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {t("betaModalBody")}
            </p>
            <p className="mt-3 text-sm text-slate-600">
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-600 underline"
              >
                {t("betaModalSource")}
              </a>
            </p>
            <button
              onClick={dismissModal}
              className="mt-5 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {t("betaModalDismiss")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
