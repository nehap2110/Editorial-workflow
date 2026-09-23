import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import PublicRoute from "./routes/PublicRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import EditorReview from "./pages/EditorReview";
import ArticleEditor from "./pages/ArticleEditor";
import MyArticles from "./pages/MyArticles";
import ArticleDetail from "./pages/ArticleDetail";
import EditorReviewArticle from "./pages/EditorReviewArticle";
import PublishedArticles from "./pages/PublishedArticles";
import RoleRoute from "./routes/RoleRoute.jsx";
import ApprovedArticles from "./pages/ApprovedArticles";
import OverdueAlerts from "./pages/OverdueAlerts";
import SectionManagement from "./pages/SectionManagement";
import SectionDetail from "./pages/SectionDetail";
import ScheduledArticles from "./pages/ScheduledArticles.jsx";
import RevisionEditor from "./pages/RevisionEditor.jsx";

/**
 * Sends unknown routes to a sensible starting point: signed-in users go
 * to their dashboard, signed-out visitors go to the landing page.
 */
const NotFoundFallback = () => {
  const { token } = useAuth();
  return <Navigate to={token ? "/dashboard" : "/"} replace />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        }
      />
      <Route path="*" element={<NotFoundFallback />} />

     <Route path="/editor/review"
         element={
          <ProtectedRoute>
          <RoleRoute allowedRoles={["editor"]}>
          <EditorReview />
          </RoleRoute>
          </ProtectedRoute>
         }
        />

        <Route path="/editor/alerts"
         element={
         <ProtectedRoute>
          <RoleRoute allowedRoles={["editor"]}>
           <OverdueAlerts />
          </RoleRoute>
         </ProtectedRoute>
          }
        />

     <Route path="/articles/new"
          element={
            <ProtectedRoute>
             <RoleRoute allowedRoles={["writer","editor"]}>
             <ArticleEditor />
             </RoleRoute>
            </ProtectedRoute>
        }
      />

     <Route path="/articles/:id/edit"
           element={
            <ProtectedRoute>
             <RoleRoute allowedRoles={["writer","editor"]}>
              <ArticleEditor />
             </RoleRoute>
            </ProtectedRoute>
          }
     />

     <Route path="/articles/revisions/:revisionId/edit"
           element={
            <ProtectedRoute>
             <RoleRoute allowedRoles={["writer"]}>
              <RevisionEditor />
             </RoleRoute>
            </ProtectedRoute>
          }
     />

      <Route path="/articles/my"
             element={
              <ProtectedRoute>
               <RoleRoute allowedRoles={["writer"]}>
               <MyArticles />
               </RoleRoute>
              </ProtectedRoute>
           }
        />

      <Route path="/articles/:id"
        element={
        <ProtectedRoute>
            <ArticleDetail />
       </ProtectedRoute>
       }
      />

      <Route path="/editor/review/:id"
           element={
           <ProtectedRoute>
            <RoleRoute allowedRoles={["editor"]}>
             <EditorReviewArticle />
            </RoleRoute>
           </ProtectedRoute>
          }
       />

       <Route path="/editor/approved"
         element={
          <ProtectedRoute>
           <ApprovedArticles />
          </ProtectedRoute>
         }
        />

       <Route path="/published"
        element={
        <ProtectedRoute>
         <PublishedArticles />
        </ProtectedRoute>
       }
       />

       <Route path="/editor/sections"
        element={
         <ProtectedRoute>
          <RoleRoute allowedRoles={["editor"]}>
           <SectionManagement />
          </RoleRoute>
          </ProtectedRoute>
        }
     />

     <Route
       path="/editor/sections/:id"
        element={
         <ProtectedRoute>
         <RoleRoute allowedRoles={["editor"]}>
         <SectionDetail />
         </RoleRoute>
         </ProtectedRoute>
        }
       />

       <Route
  path="/editor/scheduled"
  element={
    <ProtectedRoute>
    <RoleRoute allowedRoles={["editor"]}>
      <ScheduledArticles />
    </RoleRoute>
    </ProtectedRoute>
  }
/>

    </Routes>
  );
}

export default App;