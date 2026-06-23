export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-[#f5f5f5] px-6 py-4 overflow-x-auto">
      <div className="flex items-center justify-between gap-6 min-w-max">
        <p className="text-xs text-gray-600 whitespace-nowrap">
          <span className="font-semibold text-gray-700">Policy &amp; Compliance Disclaimer:</span>{' '}
          Use of this AI system is subject to Responsible AI and company policies. Ensure compliance with all applicable guidelines.
        </p>
        <p className="text-xs text-gray-600 whitespace-nowrap shrink-0">
          © 2026 UnitedHealth Group. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
