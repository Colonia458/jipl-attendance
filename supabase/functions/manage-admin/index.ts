import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Check super_admin role
    const { data: hasRole } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    if (!hasRole) throw new Error("Only super admins can manage admins");

    const { action, email, password, role, user_id, permissions } = await req.json();

    if (action === "create") {
      if (!email || !password || !role) throw new Error("Missing required fields");
      if (!["admin", "super_admin"].includes(role)) throw new Error("Invalid role");

      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) throw createError;

      // Assign role — regular admins start as 'pending', super_admins are immediately active
      const status = role === "super_admin" ? "active" : "pending";
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user!.id, role, status });
      if (roleError) throw roleError;

      // Assign permissions for regular admins
      if (role === "admin" && permissions && Array.isArray(permissions) && permissions.length > 0) {
        const permRows = permissions.map((p: string) => ({ user_id: newUser.user!.id, permission: p }));
        await supabaseAdmin.from("admin_permissions").insert(permRows);
      }

      return new Response(
        JSON.stringify({ success: true, user_id: newUser.user!.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "approve") {
      if (!user_id) throw new Error("Missing user_id");

      const { error: approveError } = await supabaseAdmin
        .from("user_roles")
        .update({ status: "active" })
        .eq("user_id", user_id);
      if (approveError) throw approveError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (!user_id) throw new Error("Missing user_id");
      if (user_id === user.id) throw new Error("Cannot remove yourself");

      // Delete permissions, role, then user
      await supabaseAdmin.from("admin_permissions").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (delError) throw delError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
