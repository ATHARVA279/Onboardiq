import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Rocket } from "lucide-react";
import { createWorkspace } from "../api/backend";
import { useWorkspace } from "../context/WorkspaceContext";

export default function WorkspaceSetup() {
  const navigate = useNavigate();
  const { refreshWorkspace } = useWorkspace();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createWorkspace(name.trim());
      await refreshWorkspace();
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-xl text-center">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A3A5C] text-xl font-bold text-white">
            O
          </div>
          <p className="mt-4 text-2xl font-bold text-[#1A3A5C]">Onboardiq</p>
        </div>

        <h1 className="mt-10 text-3xl font-semibold tracking-tight text-[#1E293B]">
          Create your team workspace
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-8 text-[#64748B]">
          Connect your codebase and start answering developer questions instantly.
        </p>

        <form
          onSubmit={handleCreate}
          className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 text-left shadow-sm"
        >
          <label className="block">
            <span className="text-sm font-medium text-[#1E293B]">Workspace Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Backend Team, Platform Engineering"
              className="mt-3 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-[#1E293B] outline-none transition focus:border-[#2E75B6] focus:ring-4 focus:ring-[#2E75B6]/10"
              required
              minLength={1}
              maxLength={100}
            />
          </label>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2E75B6] px-4 text-sm font-medium text-white transition hover:bg-[#255f93] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Workspace
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Create Workspace
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
