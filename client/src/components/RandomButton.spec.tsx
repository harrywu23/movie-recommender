import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "../App";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { delay, http, HttpResponse } from "msw";
import { server } from "../test/server";
import { BASE_URL } from "../api";
import LocationDisplay from "../test/LocationDisplay";

describe("RandomButton", () => {
    beforeAll(() => {
        vi.stubEnv("VITE_TMDB_API_KEY", "test-key");
    })

    beforeEach(() => {
        render(
            <MemoryRouter initialEntries={["/"]}>
            <Routes>
                <Route
                path="/"
                element={
                    <>
                    <App />
                    <LocationDisplay/>
                    </>
                }
                />
                <Route path="/movie/:id" element={<LocationDisplay/>} />
            </Routes>
            </MemoryRouter>,
        );
    })

    afterEach(() => {
        cleanup()
    })

    afterAll(() => {
        vi.unstubAllEnvs();
    })

    it("has valid initial text", async () => {
        expect(screen.getByText(/Want a random movie\?/i)).toBeInTheDocument();
    });

    it("changes text based on button state", async () => {

        server.use( // replace msw handler with 503 error
            http.get(`${BASE_URL}/movies/random`, async () => {
                await delay(200); // trivially long to complete mid-state assertion
                return HttpResponse.json({ message: "Successful entry" }, { status: 200 });
            })
        );

        const button = screen.getByText(/Want a random movie\?/i);
        fireEvent.click(button);

        // Intermediate state while fetch promise is unresolved
        expect(button).toHaveTextContent("Generating...");


        await waitFor(() => {
            expect(button).toHaveTextContent("Generated!");
        });
    });

    // MSW handler in place to always go to id 123
    it("successfully navigates to movie page", async () => {
        const button = screen.getByText(/Want a random movie\?/i);
        fireEvent.click(button);

        // Initially still in landing page
        expect(screen.getByTestId("location-display")).toHaveTextContent("/");

        // After completion, App should navigate
        await waitFor(() => {
            expect(button).toHaveTextContent("Generated!");
        });
        await waitFor(() => {
            expect(screen.getByTestId("location-display")).toHaveTextContent("/movie/123");
        });
    });

    it("gracefully error triggers and recovers", async () => {
        server.use( // replace msw handler with 503 error
            http.get(`${BASE_URL}/movies/random`, async () => {
                await delay(200); // trivially long to complete mid-state assertion
                return HttpResponse.json({ message: "Service down" }, { status: 503 });
            })
        );

        const button = screen.getByText(/Want a random movie\?/i);
        fireEvent.click(button);

        // mid state call, still loading
        expect(button).toHaveTextContent("Generating...");
        expect(screen.getByTestId("location-display")).toHaveTextContent("/");

        // No navigation occurs (i.e. error page)
        await waitFor(() => {
            expect(button).not.toHaveTextContent("Generated!");
        });
        await waitFor(() => {
            expect(screen.getByTestId("location-display")).toHaveTextContent("/");
        });
    });
});